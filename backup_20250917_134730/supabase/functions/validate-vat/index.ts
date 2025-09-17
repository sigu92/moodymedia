import "jsr:@supabase/functions-js/edge-runtime.d.ts";

interface VIESResponse {
  valid: boolean;
  countryCode: string;
  vatNumber: string;
  requestDate: string;
  name?: string;
  address?: string;
}

// XML escape function to prevent XML injection
const escapeXml = (unsafe: string): string => {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
};

const validateVATWithVIES = async (vatNumber: string, countryCode: string): Promise<VIESResponse | null> => {
  try {
    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    // Escape XML special characters to prevent injection
    const escapedCountryCode = escapeXml(countryCode);
    const escapedVatNumber = escapeXml(vatNumber);

    // VIES SOAP API endpoint with HTTPS
    const soapEnvelope = `<?xml version="1.0" encoding="UTF-8"?>
      <soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
        <soap:Body>
          <checkVat xmlns="urn:ec.europa.eu:taxud:vies:services:checkVat:types">
            <countryCode>${escapedCountryCode}</countryCode>
            <vatNumber>${escapedVatNumber}</vatNumber>
          </checkVat>
        </soap:Body>
      </soap:Envelope>`;

    const response = await fetch('https://ec.europa.eu/taxation_customs/vies/services/checkVatService', {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        'SOAPAction': 'checkVat'
      },
      body: soapEnvelope,
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`VIES API error: ${response.status}`);
    }

    const xmlText = await response.text();
    
    // Parse XML response using DOMParser for safety
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlText, 'text/xml');
    const validNode = doc.querySelector('valid');
    const nameNode = doc.querySelector('name');
    const addressNode = doc.querySelector('address');

    const result: VIESResponse = {
      valid: (validNode?.textContent || '').trim().toLowerCase() === 'true',
      countryCode,
      vatNumber,
      requestDate: new Date().toISOString(),
      name: (nameNode?.textContent || '').trim() || undefined,
      address: (addressNode?.textContent || '').trim() || undefined
    };
    
    return result;
  } catch (error) {
    console.warn('VIES validation failed:', error);
    return null; // Return null on VIES failure - treat as fail-safe
  }
};

Deno.serve(async (req: Request) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }

  try {
    const { vatNumber, countryCode } = await req.json();

    // Basic presence validation
    if (!vatNumber || !countryCode) {
      return new Response(JSON.stringify({ error: 'vatNumber and countryCode are required' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // Validate input types and basic format
    if (typeof vatNumber !== 'string' || typeof countryCode !== 'string') {
      return new Response(JSON.stringify({ error: 'vatNumber and countryCode must be strings' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // Normalize and validate inputs
    const normalizedCountryCode = countryCode.trim().toUpperCase();
    const normalizedVatNumber = vatNumber.trim();

    // Validate country code format (exactly 2 ASCII letters)
    if (!/^[A-Z]{2}$/.test(normalizedCountryCode)) {
      return new Response(JSON.stringify({ error: 'countryCode must be exactly 2 uppercase letters (ISO 3166-1 alpha-2)' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // Validate VAT number basic format and length
    if (normalizedVatNumber.length < 2 || normalizedVatNumber.length > 20) {
      return new Response(JSON.stringify({ error: 'vatNumber must be between 2 and 20 characters' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // Validate VAT number contains only allowed characters (letters, digits, spaces, dashes)
    if (!/^[A-Za-z0-9\s\-]+$/.test(normalizedVatNumber)) {
      return new Response(JSON.stringify({ error: 'vatNumber contains invalid characters. Only letters, digits, spaces, and dashes are allowed' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    const result = await validateVATWithVIES(normalizedVatNumber, normalizedCountryCode);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('VAT validation error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
});
