import { query } from './client';
import { 
  MediaOutlet, 
  MediaOutletInsert, 
  MediaOutletUpdate,
  Order,
  OrderInsert,
  OrderUpdate,
  CartItem,
  CartItemInsert,
  Favorite,
  FavoriteInsert,
  Metric,
  MetricInsert,
  Niche,
  NicheInsert,
  OutletNicheRule,
  OutletNicheRuleInsert
} from './types';

// Hjälpfunktioner för att bygga SQL-frågor
export class QueryBuilder {
  private table: string;
  private conditions: string[] = [];
  private orderBy: string[] = [];
  private limitValue?: number;
  private offsetValue?: number;
  private selectFields: string[] = ['*'];
  private joins: string[] = [];

  constructor(table: string) {
    this.table = table;
  }

  select(fields: string[]): this {
    this.selectFields = fields;
    return this;
  }

  eq(field: string, value: any): this {
    if (value !== null && value !== undefined) {
      this.conditions.push(`${field} = $${this.conditions.length + 1}`);
    }
    return this;
  }

  neq(field: string, value: any): this {
    if (value !== null && value !== undefined) {
      this.conditions.push(`${field} != $${this.conditions.length + 1}`);
    }
    return this;
  }

  gt(field: string, value: any): this {
    if (value !== null && value !== undefined) {
      this.conditions.push(`${field} > $${this.conditions.length + 1}`);
    }
    return this;
  }

  gte(field: string, value: any): this {
    if (value !== null && value !== undefined) {
      this.conditions.push(`${field} >= $${this.conditions.length + 1}`);
    }
    return this;
  }

  lt(field: string, value: any): this {
    if (value !== null && value !== undefined) {
      this.conditions.push(`${field} < $${this.conditions.length + 1}`);
    }
    return this;
  }

  lte(field: string, value: any): this {
    if (value !== null && value !== undefined) {
      this.conditions.push(`${field} <= $${this.conditions.length + 1}`);
    }
    return this;
  }

  in(field: string, values: any[]): this {
    if (values && values.length > 0) {
      const placeholders = values.map((_, index) => `$${this.conditions.length + index + 1}`).join(', ');
      this.conditions.push(`${field} IN (${placeholders})`);
    }
    return this;
  }

  like(field: string, pattern: string): this {
    this.conditions.push(`${field} ILIKE $${this.conditions.length + 1}`);
    return this;
  }

  order(field: string, direction: 'asc' | 'desc' = 'asc'): this {
    this.orderBy.push(`${field} ${direction.toUpperCase()}`);
    return this;
  }

  limit(count: number): this {
    this.limitValue = count;
    return this;
  }

  offset(count: number): this {
    this.offsetValue = count;
    return this;
  }

  join(table: string, condition: string): this {
    this.joins.push(`JOIN ${table} ON ${condition}`);
    return this;
  }

  leftJoin(table: string, condition: string): this {
    this.joins.push(`LEFT JOIN ${table} ON ${condition}`);
    return this;
  }

  build(): { sql: string; values: any[] } {
    let sql = `SELECT ${this.selectFields.join(', ')} FROM ${this.table}`;
    
    if (this.joins.length > 0) {
      sql += ' ' + this.joins.join(' ');
    }

    if (this.conditions.length > 0) {
      sql += ' WHERE ' + this.conditions.join(' AND ');
    }

    if (this.orderBy.length > 0) {
      sql += ' ORDER BY ' + this.orderBy.join(', ');
    }

    if (this.limitValue) {
      sql += ` LIMIT ${this.limitValue}`;
    }

    if (this.offsetValue) {
      sql += ` OFFSET ${this.offsetValue}`;
    }

    // Extrahera värden från conditions
    const values: any[] = [];
    // Här behöver vi implementera logik för att extrahera värden från conditions
    // För enkelhetens skull returnerar vi en tom array för nu

    return { sql, values };
  }
}

// Media Outlets funktioner
export const mediaOutlets = {
  // Hämta alla media outlets med metrics och niche rules
  async getAllWithMetrics(): Promise<any[]> {
    const sql = `
      SELECT 
        mo.*,
        m.ahrefs_dr,
        m.moz_da,
        m.semrush_as,
        m.spam_score,
        m.organic_traffic,
        m.referring_domains,
        m.updated_at as metrics_updated_at
      FROM media_outlets mo
      LEFT JOIN metrics m ON mo.id = m.media_outlet_id
      WHERE mo.is_active = true
      ORDER BY mo.created_at DESC
    `;
    
    const result = await query(sql);
    return result.rows;
  },

  // Hämta media outlets med niche rules
  async getWithNicheRules(mediaOutletId?: string): Promise<any[]> {
    let sql = `
      SELECT 
        mo.*,
        onr.id as rule_id,
        onr.niche_id,
        onr.accepted,
        onr.multiplier,
        n.slug as niche_slug,
        n.label as niche_label
      FROM media_outlets mo
      LEFT JOIN outlet_niche_rules onr ON mo.id = onr.media_outlet_id
      LEFT JOIN niches n ON onr.niche_id = n.id
      WHERE mo.is_active = true
    `;
    
    if (mediaOutletId) {
      sql += ' AND mo.id = $1';
      const result = await query(sql, [mediaOutletId]);
      return result.rows;
    }
    
    const result = await query(sql);
    return result.rows;
  },

  // Skapa ny media outlet
  async create(data: MediaOutletInsert): Promise<MediaOutlet> {
    const fields = Object.keys(data);
    const values = Object.values(data);
    const placeholders = values.map((_, index) => `$${index + 1}`).join(', ');
    
    const sql = `
      INSERT INTO media_outlets (${fields.join(', ')})
      VALUES (${placeholders})
      RETURNING *
    `;
    
    const result = await query(sql, values);
    return result.rows[0];
  },

  // Uppdatera media outlet
  async update(id: string, data: MediaOutletUpdate): Promise<MediaOutlet> {
    const fields = Object.keys(data);
    const values = Object.values(data);
    const setClause = fields.map((field, index) => `${field} = $${index + 1}`).join(', ');
    
    const sql = `
      UPDATE media_outlets 
      SET ${setClause}, updated_at = NOW()
      WHERE id = $${fields.length + 1}
      RETURNING *
    `;
    
    const result = await query(sql, [...values, id]);
    return result.rows[0];
  },

  // Ta bort media outlet
  async delete(id: string): Promise<void> {
    const sql = 'DELETE FROM media_outlets WHERE id = $1';
    await query(sql, [id]);
  }
};

// Orders funktioner
export const orders = {
  // Hämta orders baserat på användarroll
  async getByUserRole(userId: string, userRole: string): Promise<any[]> {
    let sql = `
      SELECT 
        o.*,
        mo.domain,
        mo.category,
        mo.publisher_id
      FROM orders o
      INNER JOIN media_outlets mo ON o.media_outlet_id = mo.id
    `;

    const values: any[] = [];
    
    if (userRole === 'publisher') {
      sql += ' WHERE o.publisher_id = $1';
      values.push(userId);
    } else if (userRole === 'buyer') {
      sql += ' WHERE o.buyer_id = $1';
      values.push(userId);
    }
    // Admin ser alla orders

    sql += ' ORDER BY o.created_at DESC';
    
    const result = await query(sql, values);
    return result.rows;
  },

  // Skapa ny order
  async create(data: OrderInsert): Promise<Order> {
    const fields = Object.keys(data);
    const values = Object.values(data);
    const placeholders = values.map((_, index) => `$${index + 1}`).join(', ');
    
    const sql = `
      INSERT INTO orders (${fields.join(', ')})
      VALUES (${placeholders})
      RETURNING *
    `;
    
    const result = await query(sql, values);
    return result.rows[0];
  },

  // Uppdatera order status
  async updateStatus(id: string, status: string, publicationUrl?: string): Promise<Order> {
    let sql = `
      UPDATE orders 
      SET status = $1, updated_at = NOW()
    `;
    const values: any[] = [status];
    
    if (publicationUrl) {
      sql += ', publication_url = $2';
      values.push(publicationUrl);
      
      if (status === 'published') {
        sql += ', publication_date = $3';
        values.push(new Date().toISOString().split('T')[0]);
      }
    } else if (status === 'published') {
      sql += ', publication_date = $2';
      values.push(new Date().toISOString().split('T')[0]);
    }
    
    sql += ` WHERE id = $${values.length + 1} RETURNING *`;
    values.push(id);
    
    const result = await query(sql, values);
    return result.rows[0];
  },

  // Uppdatera order innehåll
  async updateContent(id: string, buyerId: string, briefing: string, anchor: string, targetUrl: string): Promise<Order> {
    const sql = `
      UPDATE orders 
      SET briefing = $1, anchor = $2, target_url = $3, updated_at = NOW()
      WHERE id = $4 AND buyer_id = $5
      RETURNING *
    `;
    
    const result = await query(sql, [briefing, anchor, targetUrl, id, buyerId]);
    return result.rows[0];
  }
};

// Cart funktioner
export const cart = {
  // Hämta cart items för användare
  async getByUserId(userId: string): Promise<any[]> {
    const sql = `
      SELECT 
        ci.*,
        mo.domain,
        mo.category,
        mo.price as outlet_price,
        mo.currency
      FROM cart_items ci
      INNER JOIN media_outlets mo ON ci.media_outlet_id = mo.id
      WHERE ci.user_id = $1
      ORDER BY ci.added_at DESC
    `;
    
    const result = await query(sql, [userId]);
    return result.rows;
  },

  // Lägg till item i cart
  async addItem(data: CartItemInsert): Promise<CartItem> {
    const fields = Object.keys(data);
    const values = Object.values(data);
    const placeholders = values.map((_, index) => `$${index + 1}`).join(', ');
    
    const sql = `
      INSERT INTO cart_items (${fields.join(', ')})
      VALUES (${placeholders})
      RETURNING *
    `;
    
    const result = await query(sql, values);
    return result.rows[0];
  },

  // Ta bort item från cart
  async removeItem(userId: string, mediaOutletId: string): Promise<void> {
    const sql = 'DELETE FROM cart_items WHERE user_id = $1 AND media_outlet_id = $2';
    await query(sql, [userId, mediaOutletId]);
  },

  // Rensa cart för användare
  async clearCart(userId: string): Promise<void> {
    const sql = 'DELETE FROM cart_items WHERE user_id = $1';
    await query(sql, [userId]);
  }
};

// Favorites funktioner
export const favorites = {
  // Hämta favorites för användare
  async getByUserId(userId: string): Promise<any[]> {
    const sql = `
      SELECT 
        f.*,
        mo.domain,
        mo.category,
        mo.price,
        mo.currency
      FROM favorites f
      INNER JOIN media_outlets mo ON f.media_outlet_id = mo.id
      WHERE f.user_id = $1
      ORDER BY f.created_at DESC
    `;
    
    const result = await query(sql, [userId]);
    return result.rows;
  },

  // Lägg till favorite
  async add(data: FavoriteInsert): Promise<Favorite> {
    const fields = Object.keys(data);
    const values = Object.values(data);
    const placeholders = values.map((_, index) => `$${index + 1}`).join(', ');
    
    const sql = `
      INSERT INTO favorites (${fields.join(', ')})
      VALUES (${placeholders})
      RETURNING *
    `;
    
    const result = await query(sql, values);
    return result.rows[0];
  },

  // Ta bort favorite
  async remove(userId: string, mediaOutletId: string): Promise<void> {
    const sql = 'DELETE FROM favorites WHERE user_id = $1 AND media_outlet_id = $2';
    await query(sql, [userId, mediaOutletId]);
  },

  // Kontrollera om item är favorit
  async isFavorite(userId: string, mediaOutletId: string): Promise<boolean> {
    const sql = 'SELECT 1 FROM favorites WHERE user_id = $1 AND media_outlet_id = $2 LIMIT 1';
    const result = await query(sql, [userId, mediaOutletId]);
    return result.rows.length > 0;
  }
};

// Dashboard statistik funktioner
export const dashboard = {
  // Hämta order statistik
  async getOrderStats(userId: string, userRole: string): Promise<any> {
    let sql = `
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status IN ('requested', 'accepted', 'content_received') THEN 1 END) as pending,
        COUNT(CASE WHEN status IN ('published', 'verified') THEN 1 END) as completed,
        COUNT(CASE WHEN created_at >= DATE_TRUNC('month', CURRENT_DATE) THEN 1 END) as this_month,
        COALESCE(SUM(price), 0) as revenue
      FROM orders
    `;

    const values: any[] = [];
    
    if (userRole === 'publisher') {
      sql += ' WHERE publisher_id = $1';
      values.push(userId);
    } else if (userRole === 'buyer') {
      sql += ' WHERE buyer_id = $1';
      values.push(userId);
    }
    
    const result = await query(sql, values);
    return result.rows[0];
  },

  // Hämta cart statistik
  async getCartStats(userId: string): Promise<any> {
    const sql = `
      SELECT 
        COUNT(*) as items,
        COALESCE(SUM(price), 0) as value
      FROM cart_items
      WHERE user_id = $1
    `;
    
    const result = await query(sql, [userId]);
    return result.rows[0];
  },

  // Hämta publisher statistik
  async getPublisherStats(userId: string): Promise<any> {
    const sql = `
      SELECT 
        COUNT(DISTINCT mo.id) as outlets,
        COUNT(CASE WHEN o.status IN ('requested', 'accepted') THEN 1 END) as incoming_orders,
        COALESCE(SUM(o.price), 0) as total_earnings,
        COUNT(CASE WHEN o.created_at >= DATE_TRUNC('month', CURRENT_DATE) THEN 1 END) as this_month_orders
      FROM media_outlets mo
      LEFT JOIN orders o ON mo.id = o.media_outlet_id
      WHERE mo.publisher_id = $1
    `;
    
    const result = await query(sql, [userId]);
    return result.rows[0];
  }
};
