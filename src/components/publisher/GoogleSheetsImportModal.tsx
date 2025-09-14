import React, { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ExternalLink, FileSpreadsheet, Info, CheckCircle, AlertCircle, Upload } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { validateWebsiteMetrics } from "@/utils/metricValidation";
import type { CSVRowData, ImportResult } from "@/types/import";


// Helper function for direct batch import (no edge functions)
const performDirectBatchImport = async (rows: CSVRowData[], source: string, userId: string) => {
  const results = {
    succeeded: 0,
    failed: 0,
    skipped: 0,
    results: [] as ImportResult[]
  };

  console.log(`[DirectBatchImport] Starting ${source} import for user ${userId}, ${rows.length} rows`);

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNumber = i + 1;

    console.log(`[DirectBatchImport] Processing row ${rowNumber}:`, row);

    try {
      // Check if domain exists
      if (!row.domain) {
        console.error(`[DirectBatchImport] Row ${rowNumber} missing domain property. Available properties:`, Object.keys(row));
        results.results.push({
          row: rowNumber,
          domain: `Row ${rowNumber}`,
          success: false,
          error: 'Domain field is missing',
          skipped: false
        });
        results.failed++;
        continue;
      }

      // Normalize domain
      const normalizedDomain = row.domain
        .replace(/^https?:\/\//, '')
        .replace(/^www\./, '')
        .toLowerCase()
        .trim();

      // Check for duplicate domain
      const { data: existingOutlet, error: duplicateCheckError } = await supabase
        .from('media_outlets')
        .select('id, domain, status, publisher_id')
        .eq('domain', normalizedDomain)
        .maybeSingle();

      if (duplicateCheckError) {
        console.error(`[DirectBatchImport] Error checking for duplicate domain ${normalizedDomain}:`, duplicateCheckError);
        results.results.push({
          row: rowNumber,
          domain: normalizedDomain,
          success: false,
          error: 'Database error while checking for duplicates',
          skipped: false
        });
        results.failed++;
        continue;
      }

      if (existingOutlet) {
        results.results.push({
          row: rowNumber,
          domain: normalizedDomain,
          success: false,
          error: 'Domain already exists',
          skipped: true
        });
        results.skipped++;
        continue;
      }

      // Check if price exists and is valid
      if (row.price == null || String(row.price).trim() === '') {
        console.error(`[DirectBatchImport] Row ${rowNumber} missing price property`);
        results.results.push({
          row: rowNumber,
          domain: normalizedDomain,
          success: false,
          error: 'Publisher asking price (platform cost) field is missing',
          skipped: false
        });
        results.failed++;
        continue;
      }

      // Normalize and validate price
      const normalizedPrice = String(row.price).trim().replace(/[,\s]/g, '').replace(/[€$£¥]/g, '');
      const priceValue = parseFloat(normalizedPrice);
      
      if (isNaN(priceValue)) {
        console.error(`[DirectBatchImport] Row ${rowNumber} invalid price value: ${row.price}`);
        results.results.push({
          row: rowNumber,
          domain: normalizedDomain,
          success: false,
          error: 'Invalid price format - must be a valid number',
          skipped: false
        });
        results.failed++;
        continue;
      }

      // Boundary validation for price
      const MAX_PRICE = 1_000_000;
      if (priceValue < 0 || priceValue > MAX_PRICE) {
        console.error(`[DirectBatchImport] Row ${rowNumber} price out of bounds: ${row.price}`);
        results.results.push({
          row: rowNumber,
          domain: normalizedDomain,
          success: false,
          error: 'Publisher asking price is invalid or out of allowed range',
          skipped: false
        });
        results.failed++;
        continue;
      }

      // Prepare outlet data - map template fields to our schema
      // Publisher's uploaded price becomes the purchase_price (cost to platform)
      // Final selling price (price) will be set later by admins adding margins
      const outletData = {
        domain: normalizedDomain,
        price: null, // Will be set by admin when adding margins
        purchase_price: priceValue, // Publisher's asking price = platform cost
        currency: row.currency || 'EUR',
        country: (row.country || '').toString().trim() || '',
        language: (row.language || '').toString().trim() || '',
        category: (row.category || '').toString().trim() || '',
        niches: Array.isArray(row.niches)
          ? row.niches.map((n: string) => n.trim()).filter(Boolean)
          : (row.niches ? row.niches.toString().split(',').map((n: string) => n.trim()).filter(Boolean) : []),
        guidelines: (row.guidelines || '').toString().trim() || null,
        lead_time_days: row.lead_time_days ? parseInt(row.lead_time_days.toString()) : 7,
        accepts_no_license: row.accepts_no_license_status === 'yes' || row.accepts_no_license === 'yes',
        accepts_no_license_status: ['yes', 'no', 'depends'].includes((row.accepts_no_license_status || '').toString().toLowerCase())
          ? (row.accepts_no_license_status || '').toString().toLowerCase()
          : 'no',
        sponsor_tag_status: ['yes', 'no'].includes((row.sponsor_tag_status || '').toString().toLowerCase())
          ? (row.sponsor_tag_status || '').toString().toLowerCase()
          : 'no',
        sponsor_tag_type: ['text', 'image'].includes((row.sponsor_tag_type || '').toString().toLowerCase())
          ? (row.sponsor_tag_type || '').toString().toLowerCase()
          : 'text',
        source: source,
        publisher_id: userId,
        status: 'pending' as const,
        submitted_by: userId,
        submitted_at: new Date().toISOString(),
        is_active: false
      };

      // Insert media outlet
      const { data: outletResult, error: outletError } = await supabase
        .from('media_outlets')
        .insert(outletData)
        .select()
        .single();

      if (outletError) {
        console.error(`[DirectBatchImport] Outlet insert error for ${normalizedDomain}:`, outletError);
        results.results.push({
          row: rowNumber,
          domain: normalizedDomain,
          success: false,
          error: outletError.message,
          skipped: false
        });
        results.failed++;
        continue;
      }

      // Insert metrics if available
      if (row.ahrefs_dr || row.moz_da || row.semrush_as || row.spam_score || row.organic_traffic || row.referring_domains) {
        // Validate and normalize metric fields using shared utility
        const { values: validatedMetrics, warnings } = validateWebsiteMetrics({
          ahrefs_dr: row.ahrefs_dr,
          moz_da: row.moz_da,
          semrush_as: row.semrush_as,
          spam_score: row.spam_score,
          organic_traffic: row.organic_traffic,
          referring_domains: row.referring_domains
        });

        // Log any validation warnings
        if (warnings.length > 0) {
          console.warn(`[DirectBatchImport] Metric validation warnings for ${normalizedDomain}:`, warnings);
        }

        const metricsData = {
          media_outlet_id: outletResult.id,
          ahrefs_dr: validatedMetrics.ahrefs_dr,
          moz_da: validatedMetrics.moz_da,
          semrush_as: validatedMetrics.semrush_as,
          spam_score: validatedMetrics.spam_score,
          organic_traffic: validatedMetrics.organic_traffic,
          referring_domains: validatedMetrics.referring_domains
        };

        // Only include fields that have valid values
        const filteredMetricsData: Record<string, string | number> = Object.fromEntries(
          Object.entries(metricsData).filter(([key, value]) => value !== null)
        );

        // Only insert if there are valid metrics (excluding media_outlet_id)
        if (Object.keys(filteredMetricsData).length > 1) {
          // Ensure media_outlet_id is included
          const insertData = {
            ...filteredMetricsData,
            media_outlet_id: outletResult.id
          };
          
          const { error: metricsError } = await supabase
            .from('metrics')
            .insert(insertData);

          if (metricsError) {
            console.error(`[DirectBatchImport] Metrics insert error for ${normalizedDomain}:`, metricsError);
            // Don't fail the whole import for metrics errors
          }
        }
      }

      // Create listing
      const { error: listingError } = await supabase
        .from('listings')
        .insert({
          media_outlet_id: outletResult.id,
          is_active: false
        });

      if (listingError) {
        console.error(`[DirectBatchImport] Listing insert error for ${normalizedDomain}:`, listingError);
        // Clean up on error
        await supabase.from('media_outlets').delete().eq('id', outletResult.id);
        results.results.push({
          row: rowNumber,
          domain: normalizedDomain,
          success: false,
          error: 'Failed to create listing',
          skipped: false
        });
        results.failed++;
        continue;
      }

      results.results.push({
        row: rowNumber,
        domain: normalizedDomain,
        success: true,
        outletId: outletResult.id
      });
      results.succeeded++;

    } catch (error) {
      console.error(`[DirectBatchImport] Unexpected error for row ${rowNumber}:`, error);
      results.results.push({
        row: rowNumber,
        domain: row.domain || `Row ${rowNumber}`,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        skipped: false
      });
      results.failed++;
    }
  }

  console.log(`[DirectBatchImport] ${source} import completed:`, results);
  return results;
};


interface ImportResponse {
  message: string;
  total: number;
  succeeded: number;
  failed: number;
  skipped: number;
  results: ImportResult[];
}

interface GoogleSheetsImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete: () => void;
}

export function GoogleSheetsImportModal({ open, onOpenChange, onImportComplete }: GoogleSheetsImportModalProps) {
  const { user } = useAuth();
  const [googleSheetUrl, setGoogleSheetUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'guide' | 'preview' | 'validation' | 'import'>('guide');
  const [parsedData, setParsedData] = useState<CSVRowData[]>([]);
  const [validationResults, setValidationResults] = useState<ImportResponse | null>(null);
  const [importResults, setImportResults] = useState<ImportResponse | null>(null);

  const templateSheetUrl = "https://docs.google.com/spreadsheets/d/1F2q-150o3hpBa1qBNndVfiDJobn5xWKfnVAAHUnLEvk/edit?gid=0#gid=0";

  const handleFetchData = async () => {
    if (!googleSheetUrl.trim()) {
      toast.error('Please enter a valid Google Sheets URL');
      return;
    }

    setLoading(true);
    try {
      // More robust URL validation for Google Sheets
      const sheetIdMatch = googleSheetUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
      if (!sheetIdMatch) {
        throw new Error('Invalid Google Sheets URL. Please ensure you\'re using a URL that contains "/spreadsheets/d/" followed by the sheet ID.');
      }

      // Additional validation - check if URL looks like a valid Google Sheets URL
      if (!googleSheetUrl.includes('docs.google.com/spreadsheets')) {
        throw new Error('URL must be from Google Sheets (docs.google.com/spreadsheets)');
      }

      const sheetId = sheetIdMatch[1];
      const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=0`;

      const response = await fetch(csvUrl);
      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('Google Sheet is not publicly accessible. Please make it "Anyone with the link can view" in Share settings.');
        } else {
          throw new Error(`Failed to fetch Google Sheets data (${response.status}). Make sure the URL is correct and the sheet is public.`);
        }
      }

      const csvText = await response.text();
      const lines = csvText.split('\n').filter(line => line.trim());

      if (lines.length < 2) {
        throw new Error('Google Sheet appears to be empty or not accessible');
      }

      // Improved CSV parsing that handles quoted fields
      const parseCSVLine = (line: string): string[] => {
        const result: string[] = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
          const char = line[i];

          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
          } else {
            current += char;
          }
        }

        // Add the last field
        result.push(current.trim());

        return result;
      };

      const headers = parseCSVLine(lines[0]).map(h => h.replace(/"/g, ''));
      console.log('📊 Raw headers from sheet:', headers);

      // Check for required columns
      const requiredColumns = ['domain', 'price', 'country', 'language', 'category'];
      const missingColumns = requiredColumns.filter(col =>
        !headers.some(h => h.toLowerCase().includes(col.toLowerCase()))
      );

      if (missingColumns.length > 0) {
        throw new Error(`Missing required columns: ${missingColumns.join(', ')}. Please check your sheet matches the template format.`);
      }

      const data = lines.slice(1).filter(line => line.trim()).map(line => {
        const values = parseCSVLine(line);
        const row: CSVRowData = {};
        headers.forEach((header, index) => {
          row[header.toLowerCase()] = (values[index] || '').replace(/"/g, '');
        });
        return row;
      });

      console.log('📊 Parsed headers:', headers);
      console.log('📊 First row data:', data[0]);
      console.log('📊 All data:', data);

      setParsedData(data);
      setStep('preview');
      toast.success(`Successfully loaded ${data.length} rows from Google Sheets`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to fetch from Google Sheets');
    } finally {
      setLoading(false);
    }
  };

  const handleValidate = async () => {
    setLoading(true);
    try {
      // Perform validation by attempting to process data (dry run simulation)
      const result = {
        succeeded: 0,
        failed: 0,
        skipped: 0,
        results: [] as ImportResult[]
      };

      // Simple validation without actual database insertion
      for (let i = 0; i < parsedData.length; i++) {
        const row = parsedData[i];
        const rowNumber = i + 1;

        try {
          // Basic validation
          if (!row.domain || typeof row.domain !== 'string' || row.domain.trim() === '') {
            result.results.push({
              row: rowNumber,
              domain: row.domain || `Row ${rowNumber}`,
              success: false,
              error: 'Domain is required',
              skipped: false
            });
            result.failed++;
            continue;
          }

          const normalizedDomain = row.domain
            .replace(/^https?:\/\//, '')
            .replace(/^www\./, '')
            .toLowerCase()
            .trim();

          if (normalizedDomain.length < 3) {
            result.results.push({
              row: rowNumber,
              domain: normalizedDomain,
              success: false,
              error: 'Domain must be at least 3 characters long',
              skipped: false
            });
            result.failed++;
            continue;
          }

          // Check if price exists and is valid
          if (row.price == null || String(row.price).trim() === '') {
            result.results.push({
              row: rowNumber,
              domain: normalizedDomain,
              success: false,
              error: 'Publisher asking price (platform cost) field is missing',
              skipped: false
            });
            result.failed++;
            continue;
          }

          // Normalize and validate price
          const normalizedPrice = String(row.price).trim().replace(/[,\s]/g, '').replace(/[€$£¥]/g, '');
          const priceValue = parseFloat(normalizedPrice);
          
          if (!Number.isFinite(priceValue) || isNaN(priceValue)) {
            result.results.push({
              row: rowNumber,
              domain: normalizedDomain,
              success: false,
              error: 'Invalid price format - must be a valid number',
              skipped: false
            });
            result.failed++;
            continue;
          }

          // Boundary validation for price
          const MAX_PRICE = 1_000_000;
          if (priceValue < 0 || priceValue > MAX_PRICE) {
            result.results.push({
              row: rowNumber,
              domain: normalizedDomain,
              success: false,
              error: 'Publisher asking price is invalid or out of allowed range',
              skipped: false
            });
            result.failed++;
            continue;
          }

          // Validate accepts_no_license_status
          const licenseStatus = (row.accepts_no_license_status || '').toString().toLowerCase();
          if (licenseStatus && !['yes', 'no', 'depends'].includes(licenseStatus)) {
            result.results.push({
              row: rowNumber,
              domain: normalizedDomain,
              success: false,
              error: `accepts_no_license_status must be 'yes', 'no', or 'depends', got '${licenseStatus}'`,
              skipped: false
            });
            result.failed++;
            continue;
          }

          // Validate sponsor_tag_status
          const sponsorStatus = (row.sponsor_tag_status || '').toString().toLowerCase();
          if (sponsorStatus && !['yes', 'no'].includes(sponsorStatus)) {
            result.results.push({
              row: rowNumber,
              domain: normalizedDomain,
              success: false,
              error: `sponsor_tag_status must be 'yes' or 'no', got '${sponsorStatus}'`,
              skipped: false
            });
            result.failed++;
            continue;
          }

          // Validate sponsor_tag_type
          const sponsorType = (row.sponsor_tag_type || '').toString().toLowerCase();
          if (sponsorType && !['text', 'image'].includes(sponsorType)) {
            result.results.push({
              row: rowNumber,
              domain: normalizedDomain,
              success: false,
              error: `sponsor_tag_type must be 'text' or 'image', got '${sponsorType}'`,
              skipped: false
            });
            result.failed++;
            continue;
          }

          result.results.push({
            row: rowNumber,
            domain: normalizedDomain,
            success: true
          });
          result.succeeded++;

        } catch (error) {
          result.results.push({
            row: rowNumber,
            domain: row.domain || `Row ${rowNumber}`,
            success: false,
            error: 'Validation error',
            skipped: false
          });
          result.failed++;
        }
      }

      setValidationResults({
        ...result,
        message: result.failed > 0 ? 'Validation found errors' : 'Validation passed',
        total: result.succeeded + result.failed + result.skipped
      });
      toast.success(`Validation completed: ${result.succeeded} valid, ${result.failed} errors`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to validate data');
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    setStep('import');
    setLoading(true);
    try {
      console.log('🚀 Starting import with data:', parsedData.slice(0, 2)); // Log first 2 rows
      console.log('🚀 Data structure:', Object.keys(parsedData[0] || {})); // Log property names

      // Perform direct batch import (no edge functions)
      const importResult = await performDirectBatchImport(parsedData, 'google_sheet', user!.id);

      console.log('📦 Import result:', importResult);

      setImportResults({
        ...importResult,
        message: importResult.failed > 0 ? 'Import completed with errors' : 'Import completed successfully',
        total: importResult.succeeded + importResult.failed + importResult.skipped
      });

      if (importResult.succeeded > 0) {
        toast.success(`Successfully imported ${importResult.succeeded} websites for admin review!`);
      } else {
        toast.warning('Import completed but no websites were imported.');
      }
    } catch (error) {
      console.error('Import error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to import from Google Sheets');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Import Websites from Google Sheets
          </DialogTitle>
          <DialogDescription>
            Import multiple websites at once from your Google Sheets. All imports require admin approval before going live.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={step} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="guide" disabled={loading}>Guide</TabsTrigger>
            <TabsTrigger value="preview" disabled={loading}>1. Preview</TabsTrigger>
            <TabsTrigger value="validation" disabled={loading || parsedData.length === 0}>2. Validate</TabsTrigger>
            <TabsTrigger value="import" disabled={loading || !validationResults || validationResults.succeeded === 0}>3. Import</TabsTrigger>
          </TabsList>

          <TabsContent value="guide" className="space-y-6">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Follow these steps to import your websites from Google Sheets to Moody Media platform. All imports require admin approval.
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <span className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-sm">1</span>
                    Use Our Template
                  </CardTitle>
                  <CardDescription>
                    Start with our pre-built Google Sheets template that has all the required columns.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => window.open(templateSheetUrl, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Open Template Sheet
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <span className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-sm">2</span>
                    Make a Copy
                  </CardTitle>
                  <CardDescription>
                    In Google Sheets, go to File → Make a copy to create your own editable version.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-muted p-3 rounded-lg">
                    <p className="text-xs font-mono">File → Make a copy → Save to your Drive</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <span className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-sm">3</span>
                    Fill Your Data
                  </CardTitle>
                  <CardDescription>
                    Replace the example data with your actual website information. Keep the column headers unchanged.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm">Domain (required)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm">Price (required)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-blue-600" />
                      <span className="text-sm">Country, Language, Category</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <span className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-sm">4</span>
                    Share Settings
                  </CardTitle>
                  <CardDescription>
                    Make your sheet publicly accessible for import.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-muted p-3 rounded-lg space-y-1">
                    <p className="text-xs font-mono">Share → Anyone with the link → Viewer</p>
                    <p className="text-xs text-muted-foreground">Or use "Anyone on the internet with this link can view"</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="flex gap-4">
              <Button 
                onClick={() => setStep('preview')}
                className="flex-1"
              >
                Start Import Process
              </Button>
              <Button 
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="preview" className="space-y-6">
            {parsedData.length === 0 ? (
          <div className="space-y-6">
            <div>
              <Label htmlFor="sheet-url">Google Sheets URL</Label>
              <Input
                id="sheet-url"
                placeholder="https://docs.google.com/spreadsheets/d/..."
                value={googleSheetUrl}
                onChange={(e) => setGoogleSheetUrl(e.target.value)}
              />
              <p className="text-sm text-muted-foreground mt-2">
                    Paste the full URL of your Google Sheet here. Make sure it's publicly accessible.
              </p>
            </div>

            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Make sure your Google Sheet is publicly accessible (Anyone with the link can view) for the import to work.
              </AlertDescription>
            </Alert>

            <div className="flex gap-4">
              <Button 
                onClick={() => setStep('guide')}
                variant="outline"
              >
                Back to Guide
              </Button>
              <Button 
                onClick={handleFetchData}
                disabled={!googleSheetUrl || loading}
                className="flex-1"
              >
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                {loading ? 'Loading...' : 'Load Data'}
              </Button>
            </div>
          </div>
            ) : (
          <div className="space-y-6">
            <Alert>
                  <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                    Successfully loaded {parsedData.length} rows from your Google Sheet. Review the data below before proceeding.
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Data Preview ({parsedData.length} rows)</h3>
              <div className="max-h-96 overflow-auto border rounded-lg">
                <table className="w-full border-collapse text-sm">
                  <thead className="bg-muted sticky top-0">
                    <tr>
                      <th className="border p-2 text-left font-medium">Domain</th>
                      <th className="border p-2 text-left font-medium">Price</th>
                      <th className="border p-2 text-left font-medium">Country</th>
                      <th className="border p-2 text-left font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedData.slice(0, 10).map((row, index) => (
                      <tr key={index} className="hover:bg-muted/50">
                            <td className="border p-2">{row.domain || '-'}</td>
                            <td className="border p-2">{row.price || '-'}</td>
                            <td className="border p-2">{row.country || '-'}</td>
                        <td className="border p-2">
                              {row.domain && row.price ? (
                            <span className="text-green-600 font-medium">Ready</span>
                          ) : (
                            <span className="text-amber-600 font-medium">Missing data</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {parsedData.length > 10 && (
                <p className="text-sm text-muted-foreground">
                  Showing first 10 rows of {parsedData.length} total rows
                </p>
              )}
            </div>

            <div className="flex gap-4">
              <Button 
                    onClick={() => {
                      setGoogleSheetUrl('');
                      setParsedData([]);
                      setStep('guide');
                    }}
                variant="outline"
              >
                    Load Different Sheet
              </Button>
              <Button 
                    onClick={() => setStep('validation')}
                disabled={loading}
                className="flex-1"
              >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Proceed to Validation
              </Button>
            </div>
          </div>
        )}
          </TabsContent>

          <TabsContent value="validation" className="space-y-6">
            {!validationResults ? (
              <div className="text-center py-12">
                <Info className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Ready to Validate</h3>
                <p className="text-muted-foreground mb-6">
                  Click "Run Validation" to check your data for errors and prepare for import.
                </p>
                <Button
                  onClick={() => {
                    setStep('validation');
                    handleValidate();
                  }}
                  disabled={loading}
                  size="lg"
                >
                  {loading ? 'Validating...' : 'Run Validation'}
                </Button>
              </div>
            ) : (
              <>
          <div className="space-y-6">
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      Validation completed! Found {validationResults.succeeded} valid entries, {validationResults.failed} errors, and {validationResults.skipped} skipped.
                    </AlertDescription>
                  </Alert>

            <div className="grid grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-green-600">{validationResults.succeeded}</div>
                  <div className="text-sm text-muted-foreground">Valid</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-red-600">{validationResults.failed}</div>
                  <div className="text-sm text-muted-foreground">Failed</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                        <Info className="h-8 w-8 text-blue-500 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-blue-600">{validationResults.skipped}</div>
                  <div className="text-sm text-muted-foreground">Skipped</div>
                </CardContent>
              </Card>
            </div>

            {validationResults.failed > 0 && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="h-5 w-5 text-red-500" />
                        <h4 className="font-semibold text-red-600">Validation Failed - Action Required</h4>
                      </div>

                      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <p className="text-sm text-red-700 mb-3 font-medium">
                          ⚠️ Found {validationResults.failed} problem(s) that must be fixed before you can import.
                        </p>

                        <div className="max-h-60 overflow-y-auto space-y-3">
                          {validationResults?.results?.filter((r: ImportResult) => !r.success).slice(0, 10).map((result: ImportResult, index: number) => (
                            <div key={index} className="border-l-4 border-red-400 pl-4 py-2 bg-white rounded">
                              <div className="font-medium text-red-800 text-sm">
                                Row {result.row}: {result.domain || 'Unknown domain'}
                              </div>
                              <ul className="list-disc list-inside text-red-700 mt-1 space-y-1">
                                {result.error ? (
                                  <li className="text-sm">{result.error}</li>
                                ) : (
                                  <li className="text-sm">Unknown validation error</li>
                                )}
                              </ul>
                            </div>
                          ))}
                        </div>

                        {validationResults && validationResults.failed > 10 && (
                          <p className="text-sm text-red-600 mt-3 font-medium">
                            📋 {validationResults.failed - 10} more errors not shown. Fix these first to see the rest.
                          </p>
                        )}
                      </div>

                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <CheckCircle className="h-4 w-4 text-blue-600" />
                          <h5 className="font-medium text-blue-800">How to Fix:</h5>
                        </div>

                        <div className="space-y-2 text-sm text-blue-700">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                              <strong className="text-blue-800">Required Fields:</strong>
                              <ul className="list-disc list-inside mt-1 space-y-1">
                                <li><code className="bg-blue-100 px-1 rounded">domain</code> - Valid domain (e.g., example.com)</li>
                                <li><code className="bg-blue-100 px-1 rounded">price</code> - Publisher asking price (Number &gt; 0, e.g., 250)</li>
                                <li><code className="bg-blue-100 px-1 rounded">country</code> - Country name</li>
                                <li><code className="bg-blue-100 px-1 rounded">language</code> - Language name</li>
                              </ul>
                            </div>

                            <div>
                              <strong className="text-blue-800">Constraint Fields:</strong>
                              <ul className="list-disc list-inside mt-1 space-y-1">
                                <li><code className="bg-blue-100 px-1 rounded">accepts_no_license_status</code> - 'yes', 'no', or 'depends'</li>
                                <li><code className="bg-blue-100 px-1 rounded">sponsor_tag_status</code> - 'yes' or 'no'</li>
                                <li><code className="bg-blue-100 px-1 rounded">sponsor_tag_type</code> - 'text' or 'image'</li>
                        </ul>
                            </div>
                          </div>

                          <div className="mt-3 pt-3 border-t border-blue-200">
                            <strong className="text-blue-800">Next Steps:</strong>
                            <ol className="list-decimal list-inside mt-1 space-y-1">
                              <li>Go back to your Google Sheet</li>
                              <li>Fix the errors shown above</li>
                              <li>Save your changes</li>
                              <li>Click "Run Validation" again</li>
                              <li>Only proceed with import when validation passes</li>
                            </ol>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-amber-600 bg-amber-50 border border-amber-200 rounded-lg p-3">
                        <AlertCircle className="h-4 w-4 flex-shrink-0" />
                        <p className="text-sm">
                          <strong>Important:</strong> Import will be blocked until all validation errors are resolved.
                          This prevents database errors and ensures data quality.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

            <div className="flex gap-4">
              <Button 
                onClick={() => setStep('preview')}
                variant="outline"
              >
                Back to Preview
              </Button>
              {validationResults.succeeded > 0 && (
                    <Button
                      onClick={() => setStep('import')}
                      disabled={loading}
                      className="flex-1"
                    >
                      Proceed to Import ({validationResults.succeeded} sites)
                    </Button>
                  )}
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="import" className="space-y-6">
            {!importResults ? (
              <div className="text-center py-12">
                <FileSpreadsheet className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Ready to Import</h3>
                <p className="text-muted-foreground mb-6">
                  Import {validationResults?.succeeded || 0} validated websites for admin approval.
                </p>
                <Button 
                  onClick={handleImport}
                  disabled={loading}
                  size="lg"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {loading ? 'Importing...' : `Import ${validationResults?.succeeded || 0} Websites`}
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    Import completed! {importResults?.succeeded || 0} websites submitted for admin review, {importResults?.failed || 0} failed, {importResults?.skipped || 0} skipped.
                  </AlertDescription>
                </Alert>

                <div className="grid grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="p-4 text-center">
                      <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
                      <div className="text-2xl font-bold text-green-600">{importResults?.succeeded || 0}</div>
                      <div className="text-sm text-muted-foreground">Imported</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
                      <div className="text-2xl font-bold text-red-600">{importResults?.failed || 0}</div>
                      <div className="text-sm text-muted-foreground">Failed</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <Info className="h-8 w-8 text-blue-500 mx-auto mb-2" />
                      <div className="text-2xl font-bold text-blue-600">{importResults?.skipped || 0}</div>
                      <div className="text-sm text-muted-foreground">Skipped</div>
                    </CardContent>
                  </Card>
                </div>

                {importResults && importResults.failed > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-semibold text-red-600">Import Errors</h4>
                    <div className="max-h-60 overflow-y-auto space-y-2">
                      {importResults?.results?.filter((r: ImportResult) => !r.success).slice(0, 10).map((result: ImportResult, index: number) => (
                        <div key={index} className="flex items-start gap-2 p-3 bg-red-50 rounded border border-red-200">
                          <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                          <div className="text-sm">
                            <span className="font-medium">Row {result.row}: {result.domain}</span>
                            <ul className="list-disc list-inside text-red-700 mt-1">
                              {result.error ? (
                                <li>{result.error}</li>
                              ) : (
                                <li>No error details available - check console for details</li>
                              )}
                            </ul>
            </div>
                        </div>
                      ))}
                    </div>
                    {importResults.failed > 10 && (
                      <p className="text-sm text-muted-foreground">
                        And {importResults.failed - 10} more errors...
                      </p>
                    )}
          </div>
        )}

                <div className="flex gap-4">
                  <Button
                    onClick={() => setStep('validation')}
                    variant="outline"
                  >
                    Back to Validation
                  </Button>
                  {importResults && importResults.succeeded > 0 && (
                    <Button
                      onClick={() => {
                        onImportComplete();
                        onOpenChange(false);
                      }}
                      className="flex-1"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Done ({importResults.succeeded} sites submitted)
                    </Button>
                  )}
                </div>
          </div>
        )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}