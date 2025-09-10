import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, Database, FileSpreadsheet, Users, DollarSign } from 'lucide-react';
import SEOHead from '@/components/SEOHead';
import { EconomyAnalytics } from '@/components/admin/EconomyAnalytics';
import { BulkWebsiteEditor } from '@/components/admin/BulkWebsiteEditor';
import { EnhancedImport } from '@/components/admin/EnhancedImport';
import { AccountsOverview } from '@/components/admin/AccountsOverview';
import { PayoutsManagement } from '@/components/admin/PayoutsManagement';

const AdminSystem = () => {
  return (
    <>
      <SEOHead 
        title="System Admin Console"
        description="System administration panel for managing analytics, websites, imports, accounts, and payouts"
      />
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight">System Admin Console</h1>
            <p className="text-muted-foreground mt-2">
              Manage platform operations, analytics, and user accounts
            </p>
          </div>

          <Tabs defaultValue="analytics" className="space-y-6">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="analytics" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Analytics
              </TabsTrigger>
              <TabsTrigger value="websites" className="flex items-center gap-2">
                <Database className="h-4 w-4" />
                Websites
              </TabsTrigger>
              <TabsTrigger value="import" className="flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4" />
                Import
              </TabsTrigger>
              <TabsTrigger value="accounts" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Accounts
              </TabsTrigger>
              <TabsTrigger value="payouts" className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Payouts
              </TabsTrigger>
            </TabsList>

            <TabsContent value="analytics" className="space-y-6">
              <EconomyAnalytics />
            </TabsContent>

            <TabsContent value="websites" className="space-y-6">
              <BulkWebsiteEditor />
            </TabsContent>

            <TabsContent value="import" className="space-y-6">
              <EnhancedImport />
            </TabsContent>

            <TabsContent value="accounts" className="space-y-6">
              <AccountsOverview />
            </TabsContent>

            <TabsContent value="payouts" className="space-y-6">
              <PayoutsManagement />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </>
  );
};

export default AdminSystem;