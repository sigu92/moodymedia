import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Upload,
  Download,
  FileSpreadsheet,
  CheckCircle,
  AlertTriangle,
  X,
  Save,
  RefreshCw,
  Database,
  FileX
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { CSVRowData, ImportResult } from "@/types/import";

// Simple CSV parser that handles quoted fields
const parseCSVText = (csvText: string): string[][] => {
  const lines: string[][] = [];
  let currentLine: string[] = [];
  let currentField = '';
  let inQuotes = false;
  let i = 0;

  while (i < csvText.length) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        currentField += '"';
        i += 2;
        continue;
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // Field separator
      currentLine.push(currentField.trim());
      currentField = '';
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      // Line separator
      if (currentField || currentLine.length > 0) {
        currentLine.push(currentField.trim());
        lines.push(currentLine);
        currentLine = [];
        currentField = '';
      }
      if (char === '\r' && nextChar === '\n') {
        i++; // Skip \n after \r
      }
    } else {
      currentField += char;
    }
    i++;
  }

  // Handle last field/line
  if (currentField || currentLine.length > 0) {
    currentLine.push(currentField.trim());
    lines.push(currentLine);
  }

  return lines.filter(line => line.some(field => field.trim() !== ''));
};

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

    try {
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

      // Prepare outlet data
      // Publisher's uploaded price becomes the purchase_price (cost to platform)
      // Final selling price (price) will be set later by admins adding margins
      const outletData = {
        domain: normalizedDomain,
        price: null, // Will be set by admin when adding margins
        purchase_price: parseFloat(String(row.price)) || 0, // Publisher's asking price = platform cost
        currency: row.currency || 'EUR',
        country: row.country?.trim() || '',
        language: row.language?.trim() || '',
        category: row.category?.trim() || '',
        niches: Array.isArray(row.niches)
          ? (row.niches as string[]).map((n: string) => n.trim()).filter(Boolean)
          : (row.niches ? (row.niches as string).split(',').map((n: string) => n.trim()).filter(Boolean) : []),
        guidelines: row.guidelines?.trim() || null,
        lead_time_days: row.lead_time_days ? parseInt(row.lead_time_days.toString()) : 7,
        accepts_no_license: row.accepts_no_license === 'yes' || row.accepts_no_license === true,
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
        const metricsData = {
          media_outlet_id: outletResult.id,
          ahrefs_dr: row.ahrefs_dr ? parseInt(row.ahrefs_dr.toString()) : 0,
          moz_da: row.moz_da ? parseInt(row.moz_da.toString()) : 0,
          semrush_as: row.semrush_as ? parseInt(row.semrush_as.toString()) : 0,
          spam_score: row.spam_score ? parseInt(row.spam_score.toString()) : 0,
          organic_traffic: row.organic_traffic ? parseInt(row.organic_traffic.toString()) : 0,
          referring_domains: row.referring_domains ? parseInt(row.referring_domains.toString()) : 0
        };

        const { error: metricsError } = await supabase
          .from('metrics')
          .insert(metricsData);

        if (metricsError) {
          console.error(`[DirectBatchImport] Metrics insert error for ${normalizedDomain}:`, metricsError);
          // Don't fail the whole import for metrics errors
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

interface CSVImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface ImportRow {
  domain: string;
  category: string;
  price: number;
  currency: string;
  country: string;
  language: string;
  lead_time_days: number;
  guidelines: string;
  niches: string;
  is_active: boolean;
  accepts_no_license_status?: 'yes' | 'no' | 'depends';
  sponsor_tag_status?: 'yes' | 'no';
  sponsor_tag_type?: 'image' | 'text';
  sale_price?: number;
  sale_note?: string;
  status?: 'valid' | 'error';
  errors?: string[];
}

export function CSVImportModal({ isOpen, onClose, onSuccess }: CSVImportModalProps) {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<ImportRow[]>([]);
  const [validRows, setValidRows] = useState<ImportRow[]>([]);
  const [errorRows, setErrorRows] = useState<ImportRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [activeTab, setActiveTab] = useState('upload');

  const csvTemplate = `domain,category,price,currency,country,language,lead_time_days,guidelines,niches,is_active,accepts_no_license_status,sponsor_tag_status,sponsor_tag_type,sale_price,sale_note,ahrefs_dr,moz_da,semrush_as,spam_score,organic_traffic,referring_domains
example1.com,Blog,250,EUR,SE,Swedish,7,"No adult content, quality articles only","Technology,Health",true,no,yes,text,200,"Limited time offer",35,28,40,15,5000,150
example2.com,News,300,EUR,NO,Norwegian,5,"Follow editorial guidelines","Business,Finance",true,depends,no,text,,,42,31,38,12,8500,220`;

  const downloadTemplate = () => {
    // Add BOM (Byte Order Mark) to ensure UTF-8 encoding is recognized by Excel and other applications
    const BOM = '\uFEFF';
    const csvContent = BOM + csvTemplate;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'media_outlets_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('Template downloaded successfully');
  };

  const exportExistingSites = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('media_outlets')
        .select('*')
        .eq('publisher_id', user.id);

      if (error) throw error;

      const csvContent = [
        'domain,category,price,currency,country,language,lead_time_days,guidelines,niches,is_active,accepts_no_license_status,sponsor_tag_status,sponsor_tag_type,sale_price,sale_note',
        ...data.map(site => 
          `${site.domain},${site.category},${site.price},${site.currency},${site.country},${site.language},${site.lead_time_days},"${site.guidelines || ''}","${(site.niches || []).join(';')}",${site.is_active},${site.accepts_no_license_status || 'no'},${site.sponsor_tag_status || 'no'},${site.sponsor_tag_type || 'text'},${site.sale_price || ''},${site.sale_note || ''}`
        )
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `media_outlets_export_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('Sites exported successfully');
    } catch (error) {
      console.error('Error exporting sites:', error);
      toast.error('Failed to export sites');
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (selectedFile: File) => {
    if (!selectedFile.name.endsWith('.csv')) {
      toast.error('Please select a CSV file');
      return;
    }

    setFile(selectedFile);
    parseCSV(selectedFile);
  };

  const parseCSV = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = parseCSVText(text);

      if (lines.length < 2) {
        toast.error('CSV file must contain at least a header and one data row');
        return;
      }

      const headers = lines[0].map(h => h.trim().toLowerCase());
      const requiredHeaders = ['domain', 'category', 'price', 'currency', 'country', 'language'];
      
      const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
      if (missingHeaders.length > 0) {
        toast.error(`Missing required columns: ${missingHeaders.join(', ')}`);
        return;
      }

      const data: ImportRow[] = lines.slice(1).map((line, index) => {
        const values = line; // line is already an array from parseCSV
        const row: CSVRowData = {} as any;

        headers.forEach((header, i) => {
          row[header] = values[i] || '';
        });

        return {
          domain: row.domain as string,
          category: row.category as string,
          price: parseFloat(String(row.price)) || 0, // Publisher's asking price (initial marketplace price)
          purchase_price: parseFloat(String(row.price)) || null, // Publisher's asking price
          currency: (row.currency as string) || 'EUR',
          country: row.country as string,
          language: row.language as string,
          lead_time_days: parseInt(row.lead_time_days as string) || 7,
          guidelines: (row.guidelines as string) || '',
          niches: typeof row.niches === 'string' ? row.niches : Array.isArray(row.niches) ? row.niches.join(', ') : '',
          is_active: (row.is_active as any) === 'true' || (row.is_active as any) === '1',
          accepts_no_license_status: (row.accepts_no_license_status as string) || 'no',
          sponsor_tag_status: (row.sponsor_tag_status as string) || 'no',
          sponsor_tag_type: (row.sponsor_tag_type as string) || 'text',
          sale_price: row.sale_price ? parseFloat(String(row.sale_price)) : undefined,
          sale_note: (row.sale_note as string) || ''
        } as any;
      });

      setCsvData(data);
      validateData(data);
      setActiveTab('preview');
    };
    reader.readAsText(file);
  };

  const validateData = (data: ImportRow[]) => {
    const valid: ImportRow[] = [];
    const errors: ImportRow[] = [];

    data.forEach(row => {
      const rowErrors: string[] = [];
      
      // Required field validation
      if (!row.domain) rowErrors.push('Domain is required');
      if (!row.category) rowErrors.push('Category is required');
      if (!row.price || parseFloat(String(row.price)) <= 0) rowErrors.push('Publisher asking price (platform cost) must be greater than 0');
      if (!row.country) rowErrors.push('Country is required');
      if (!row.language) rowErrors.push('Language is required');

      // Format validation
      if (row.domain && !row.domain.includes('.')) {
        rowErrors.push('Invalid domain format');
      }

      if (rowErrors.length > 0) {
        errors.push({ ...row, status: 'error', errors: rowErrors });
      } else {
        valid.push({ ...row, status: 'valid' });
      }
    });

    setValidRows(valid);
    setErrorRows(errors);
  };

  const importData = async () => {
    if (!user || !validRows.length) return;

    setImporting(true);
    setImportProgress(0);

    try {
      // Use the existing validated rows from the parseCSV function
      // This avoids duplicate CSV parsing and ensures consistency
      const data = await performDirectBatchImport(validRows, 'csv', user!.id);

      toast.success(`Import completed! ${data.succeeded} websites imported, ${data.failed} failed, ${data.skipped} skipped.`);
      
      onSuccess();
      onClose();
      resetState();
    } catch (error) {
      console.error('Error importing data:', error);
      toast.error('Failed to import data');
    } finally {
      setImporting(false);
      setImportProgress(0);
    }
  };

  const resetState = () => {
    setFile(null);
    setCsvData([]);
    setValidRows([]);
    setErrorRows([]);
    setActiveTab('upload');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto glass-modal">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            CSV Import & Export
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="upload">Upload</TabsTrigger>
            <TabsTrigger value="preview" disabled={!csvData.length}>Preview</TabsTrigger>
            <TabsTrigger value="validation" disabled={!csvData.length}>Validation</TabsTrigger>
            <TabsTrigger value="export">Export</TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="space-y-6">
            <Card className="glass-card-clean">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5 text-primary" />
                  Upload CSV File
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                    dragActive 
                      ? 'border-primary bg-primary/5' 
                      : 'border-border hover:border-primary/50'
                  }`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  <FileSpreadsheet className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  {file ? (
                    <div className="space-y-2">
                      <p className="font-semibold">{file.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {(file.size / 1024).toFixed(2)} KB
                      </p>
                      <Button variant="outline" onClick={() => setFile(null)} className="glass-button">
                        <X className="h-4 w-4 mr-2" />
                        Remove
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <p className="text-lg font-semibold">Drop your CSV file here</p>
                      <p className="text-muted-foreground">or click to browse files</p>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".csv"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                      <Button 
                        onClick={() => fileInputRef.current?.click()}
                        className="glass-button-primary"
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        Choose File
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card-clean">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="h-5 w-5 text-green-600" />
                  CSV Template
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Button onClick={downloadTemplate} variant="outline" className="glass-button">
                  <Download className="h-4 w-4 mr-2" />
                  Download Template
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="preview" className="space-y-6">
            <Card className="glass-card-clean">
              <CardHeader>
                <CardTitle>Data Preview ({csvData.length} rows)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="max-h-96 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Domain</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Country</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {csvData.slice(0, 10).map((row, index) => (
                        <TableRow key={index}>
                          <TableCell>{row.domain}</TableCell>
                          <TableCell>{row.category}</TableCell>
                          <TableCell>{row.currency} {row.price}</TableCell>
                          <TableCell>{row.country}</TableCell>
                          <TableCell>
                            <Badge variant={row.is_active ? "default" : "secondary"}>
                              {row.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <div className="flex justify-end mt-4">
                  <Button 
                    onClick={() => setActiveTab('validation')} 
                    className="glass-button-primary"
                  >
                    Validate Data
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="validation" className="space-y-6">
            <div className="grid grid-cols-3 gap-4">
              <Card className="glass-card-clean">
                <CardContent className="p-4 text-center">
                  <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-green-600">{validRows.length}</div>
                  <p className="text-sm text-muted-foreground">Valid Rows</p>
                </CardContent>
              </Card>
              <Card className="glass-card-clean">
                <CardContent className="p-4 text-center">
                  <AlertTriangle className="h-8 w-8 text-red-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-red-600">{errorRows.length}</div>
                  <p className="text-sm text-muted-foreground">Errors</p>
                </CardContent>
              </Card>
              <Card className="glass-card-clean">
                <CardContent className="p-4 text-center">
                  <Database className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-blue-600">{csvData.length}</div>
                  <p className="text-sm text-muted-foreground">Total Rows</p>
                </CardContent>
              </Card>
            </div>

            {errorRows.length > 0 && (
              <Card className="glass-card-clean">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-red-500" />
                    <CardTitle className="text-red-600">Validation Failed - Action Required</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-sm text-red-700 mb-3 font-medium">
                      ⚠️ Found {errorRows.length} problem(s) in your CSV file that must be fixed before importing.
                    </p>

                    <div className="max-h-60 overflow-y-auto space-y-3">
                      {errorRows.slice(0, 10).map((row, index) => (
                        <div key={index} className="border-l-4 border-red-400 pl-4 py-2 bg-white rounded">
                          <div className="font-medium text-red-800 text-sm">
                            {row.domain || 'Unknown domain'}
                          </div>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {row.errors?.map((error, i) => (
                              <Badge key={i} variant="destructive" className="text-xs">
                                {error}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      ))}

                      {errorRows.length > 10 && (
                        <p className="text-sm text-red-600 font-medium">
                          📋 {errorRows.length - 10} more errors not shown. Fix these first to see the rest.
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <CheckCircle className="h-4 w-4 text-blue-600" />
                      <h5 className="font-medium text-blue-800">How to Fix Your CSV:</h5>
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
                        <strong className="text-blue-800">CSV Format Example:</strong>
                        <div className="mt-2 bg-white border border-blue-200 rounded p-2 font-mono text-xs overflow-x-auto">
                          domain,category,price,currency,country,language,accepts_no_license_status,sponsor_tag_status<br/>
                          example.com,Blog,250,EUR,Sweden,Swedish,no,yes<br/>
                          mysite.com,News,300,EUR,Norway,Norwegian,yes,no
                        </div>
                      </div>

                      <div className="mt-3 pt-3 border-t border-blue-200">
                        <strong className="text-blue-800">Next Steps:</strong>
                        <ol className="list-decimal list-inside mt-1 space-y-1">
                          <li>Edit your CSV file to fix the errors</li>
                          <li>Save the corrected file</li>
                          <li>Re-upload the CSV file</li>
                          <li>Only proceed with import when validation passes</li>
                        </ol>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-amber-600 bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                    <p className="text-sm">
                      <strong>Important:</strong> Import will be blocked until all validation errors are resolved.
                      This prevents database errors and ensures data quality.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {importing && (
              <Card className="glass-card-clean">
                <CardContent className="p-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Importing data...</span>
                      <span>{Math.round(importProgress)}%</span>
                    </div>
                    <Progress value={importProgress} className="h-2" />
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="flex justify-end">
              <Button 
                onClick={importData}
                disabled={validRows.length === 0 || importing}
                className="glass-button-primary"
              >
                {importing ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Import {validRows.length} Sites
                  </>
                )}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="export" className="space-y-6">
            <Card className="glass-card-clean">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="h-5 w-5 text-green-600" />
                  Export Existing Sites
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Button onClick={exportExistingSites} className="glass-button-primary">
                  <Download className="h-4 w-4 mr-2" />
                  Export All Sites
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end">
          <Button variant="outline" onClick={() => { onClose(); resetState(); }} className="glass-button">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}