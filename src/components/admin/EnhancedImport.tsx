import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Upload, FileSpreadsheet, Link, CheckCircle, XCircle, AlertCircle, Download, Tag } from 'lucide-react';

interface ImportResult {
  row: number;
  domain: string;
  success: boolean;
  errors: string[];
  skipped: boolean;
}

interface ImportResponse {
  message: string;
  total_rows: number;
  succeeded: number;
  failed: number;
  dry_run: boolean;
  results: ImportResult[];
}

export function EnhancedImport() {
  const { userRoles, hasRole, isSystemAdmin, user } = useAuth();

  // Debug logging
  console.log('🔍 EnhancedImport Debug:', {
    userRoles,
    isSystemAdmin,
    user: user?.email,
    hasAdminRole: hasRole('admin'),
    hasSystemAdminRole: hasRole('system_admin')
  });
  const [file, setFile] = useState<File | null>(null);
  const [googleSheetUrl, setGoogleSheetUrl] = useState('');
  const [importMode, setImportMode] = useState<'upload' | 'google'>('upload');
  const [selectedAdminTag, setSelectedAdminTag] = useState<string>('');
  const [mapping, setMapping] = useState({
    domain: 'none',
    price: 'none',
    currency: 'EUR',
    country: 'none',
    language: 'none',
    category: 'none',
    niches: 'none',
    ahrefs_dr: 'none',
    moz_da: 'none',
    semrush_as: 'none',
    spam_score: 'none',
    organic_traffic: 'none',
    referring_domains: 'none',
    admin_tags: 'none',
  });
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [availableColumns, setAvailableColumns] = useState<string[]>([]);
  const [step, setStep] = useState<'upload' | 'mapping' | 'admin_tags' | 'preview' | 'results'>('upload');
  const [loading, setLoading] = useState(false);
  const [importResults, setImportResults] = useState<ImportResponse | null>(null);
  const { toast } = useToast();

  // isSystemAdmin is already provided by useAuth()

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setLoading(true);

    try {
      // Parse CSV file (simplified implementation)
      const text = await selectedFile.text();
      const lines = text.split('\n').filter(line => line.trim());
      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
      const rows = lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
        const row: any = {};
        headers.forEach((header, index) => {
          row[header] = values[index] || '';
        });
        return row;
      });

      setAvailableColumns(headers);
      setParsedData(rows);
      setStep('mapping');
      toast({
        title: "File uploaded successfully",
        description: `Found ${rows.length} rows with ${headers.length} columns`,
      });
    } catch (error) {
      console.error('File parse error:', error);
      toast({
        title: "Error parsing file",
        description: "Please check your file format and try again",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSheetImport = async () => {
    if (!googleSheetUrl.trim()) {
      toast({
        title: "Error",
        description: "Please enter a valid Google Sheet URL",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    
    try {
      // Extract sheet ID from Google Sheets URL
      const sheetIdMatch = googleSheetUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
      if (!sheetIdMatch) {
        throw new Error('Invalid Google Sheets URL');
      }
      
      const sheetId = sheetIdMatch[1];
      const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=0`;
      
      // Fetch CSV data
      const response = await fetch(csvUrl);
      if (!response.ok) {
        throw new Error('Failed to fetch Google Sheet. Make sure it\'s shared publicly.');
      }
      
      const csvText = await response.text();
      
      // Parse CSV
      const lines = csvText.split('\n').filter(line => line.trim());
      if (lines.length < 2) {
        throw new Error('Sheet appears to be empty or has no data rows');
      }
      
      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
      const rows = lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
        const row: any = {};
        headers.forEach((header, index) => {
          row[header] = values[index] || '';
        });
        return row;
      });
      
      // Create mapping based on common column names
      const autoMapping: any = {};
      const columnMap: { [key: string]: string[] } = {
        domain: ['domain', 'website', 'url', 'site'],
        price: ['price', 'cost', 'amount'],
        currency: ['currency'],
        country: ['country'],
        language: ['language', 'lang'],
        category: ['category', 'type'],
        niches: ['niches', 'niche', 'topics'],
        guidelines: ['guidelines', 'rules', 'instructions'],
        lead_time_days: ['lead_time_days', 'lead_time', 'turnaround'],
        min_word_count: ['min_word_count', 'min_words'],
        max_word_count: ['max_word_count', 'max_words'],
        turnaround_time: ['turnaround_time', 'delivery_time'],
        required_format: ['required_format', 'format'],
        content_types: ['content_types', 'types'],
        forbidden_topics: ['forbidden_topics', 'forbidden'],
        accepts_no_license: ['accepts_no_license', 'no_license'],
        sponsor_tag_status: ['sponsor_tag_status', 'sponsor_tag'],
        sponsor_tag_type: ['sponsor_tag_type'],
        sponsor_tag: ['sponsor_tag'],
        sale_price: ['sale_price'],
        sale_note: ['sale_note'],
        admin_tags: ['admin_tags', 'tags'],
        ahrefs_dr: ['ahrefs_dr', 'dr', 'domain_rating'],
        moz_da: ['moz_da', 'da', 'domain_authority'],
        semrush_as: ['semrush_as', 'as', 'authority_score'],
        spam_score: ['spam_score', 'spam'],
        organic_traffic: ['organic_traffic', 'traffic'],
        referring_domains: ['referring_domains', 'ref_domains', 'backlinks']
      };
      
      // Auto-map columns
      Object.keys(columnMap).forEach(field => {
        const possibleColumns = columnMap[field];
        for (const col of possibleColumns) {
          const foundHeader = headers.find(h => h.toLowerCase().includes(col.toLowerCase()));
          if (foundHeader) {
            autoMapping[field] = foundHeader;
            break;
          }
        }
      });
      
      // Set the data and proceed to mapping step
      setAvailableColumns(headers);
      setParsedData(rows);
      setMapping(prev => ({ ...prev, ...autoMapping }));
      setStep('mapping');
      
      toast({
        title: "Success",
        description: `Loaded ${rows.length} rows from Google Sheets. Review column mapping below.`,
      });
      
    } catch (error) {
      console.error('Import error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to import from Google Sheets. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const validateMapping = () => {
    const requiredFields = ['domain', 'price'];
    const missingFields = requiredFields.filter(field => !mapping[field as keyof typeof mapping] || mapping[field as keyof typeof mapping] === 'none');
    
    if (missingFields.length > 0) {
      toast({
        title: "Missing required mappings",
        description: `Please map the following required fields: ${missingFields.join(', ')}`,
        variant: "destructive",
      });
      return false;
    }
    return true;
  };

  const handlePreview = () => {
    if (!validateMapping()) return;
    // System admins get admin tags step, others go directly to preview
    if (isSystemAdmin) {
      setStep('admin_tags');
    } else {
      setStep('preview');
    }
  };

  const handleAdminTagsNext = () => {
    if (!selectedAdminTag) {
      toast({
        title: "Tag selection required",
        description: "Please select an admin tag for this import",
        variant: "destructive",
      });
      return;
    }
    setStep('preview');
  };

  const handleImport = async (dryRun = false) => {
    if (!validateMapping()) return;

    setLoading(true);
    try {
      console.log('🚀 Calling admin-import-batch with:', {
        source: importMode === 'upload' ? 'csv' : 'google_sheet',
        data_length: parsedData?.length,
        mapping,
        dry_run: dryRun,
        admin_tags: selectedAdminTag ? [selectedAdminTag] : [],
        user_roles: userRoles,
        is_system_admin: isSystemAdmin
      });

      const { data, error } = await supabase.functions.invoke('admin-import-batch', {
        body: {
          source: importMode === 'upload' ? 'csv' : 'google_sheet',
          data: parsedData,
          mapping,
          dry_run: dryRun,
          admin_tags: selectedAdminTag ? [selectedAdminTag] : [],
        },
      });

      console.log('📥 Response from admin-import-batch:', { data, error });

      if (error) throw error;

      setImportResults(data);
      setStep('results');
      
      toast({
        title: dryRun ? "Dry run completed" : "Import completed",
        description: `${data.succeeded} successful, ${data.failed} failed out of ${data.total_rows} rows`,
      });
    } catch (error) {
      console.error('Import error:', error);

      // Extract meaningful error message
      let errorMessage = "An error occurred during import";
      let errorTitle = "Import failed";

      if (error?.message) {
        // Handle specific error types
        if (error.message.includes('Edge Function returned a non-2xx status code')) {
          errorTitle = "Server Error";
          errorMessage = "The import server returned an error. Please check the console for details.";
        } else if (error.message.includes('Access denied')) {
          errorTitle = "Access Denied";
          errorMessage = "You don't have permission to perform this import.";
        } else if (error.message.includes('Missing required parameter')) {
          errorTitle = "Configuration Error";
          errorMessage = error.message;
        } else if (error.message.includes('Import too large')) {
          errorTitle = "Import Too Large";
          errorMessage = "The import file is too large. Please reduce the number of rows.";
        } else {
          errorMessage = error.message;
        }
      }

      toast({
        title: errorTitle,
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const downloadErrorReport = () => {
    if (!importResults) return;

    const errors = importResults.results.filter(r => !r.success);
    const csvContent = [
      ['Row', 'Domain', 'Errors'].join(','),
      ...errors.map(error => [
        error.row,
        error.domain,
        error.errors.join('; ')
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'import_errors.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const resetImport = () => {
    setFile(null);
    setGoogleSheetUrl('');
    setSelectedAdminTag('');
    setParsedData([]);
    setAvailableColumns([]);
    setImportResults(null);
    setStep('upload');
    setMapping({
      domain: 'none',
      price: 'none',
      currency: 'EUR',
      country: 'none',
      language: 'none',
      category: 'none',
      niches: 'none',
      ahrefs_dr: 'none',
      moz_da: 'none',
      semrush_as: 'none',
      spam_score: 'none',
      organic_traffic: 'none',
      referring_domains: 'none',
      admin_tags: 'none',
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Enhanced Website Import</CardTitle>
        <CardDescription>
          Import websites from CSV, XLSX, or Google Sheets with validation and mapping
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {step === 'upload' && (
          <Tabs value={importMode} onValueChange={(value) => setImportMode(value as 'upload' | 'google')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="upload">File Upload</TabsTrigger>
              <TabsTrigger value="google">Google Sheets</TabsTrigger>
            </TabsList>
            
            <TabsContent value="upload" className="space-y-4">
              <div className="space-y-4">
                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
                  <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <Label htmlFor="file-upload" className="cursor-pointer">
                    <span className="text-lg font-medium">Choose CSV or XLSX file</span>
                    <Input
                      id="file-upload"
                      type="file"
                      accept=".csv,.xlsx"
                      className="hidden"
                      onChange={handleFileUpload}
                      disabled={loading}
                    />
                  </Label>
                  <p className="text-sm text-muted-foreground mt-2">
                    Drag and drop or click to select your file
                  </p>
                </div>
                <Button 
                  variant="outline"
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = '/templates/admin-websites-template.csv';
                    link.download = 'admin-websites-template.csv';
                    link.click();
                    toast({ title: 'Template downloaded successfully' });
                  }}
                  className="w-full"
                >
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Download CSV Template
                </Button>
              </div>
            </TabsContent>
            
            <TabsContent value="google" className="space-y-4">
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <h4 className="font-semibold text-blue-900 mb-2">📋 Google Sheets Template</h4>
                  <p className="text-sm text-blue-800 mb-3">
                    Use our template with all required columns and example data:
                  </p>
                  <Button 
                    variant="outline"
                    onClick={() => window.open('https://docs.google.com/spreadsheets/d/1F2q-150o3hpBa1qBNndVfiDJobn5xWKfnVAAHUnLEvk/edit?gid=0#gid=0', '_blank')}
                    className="w-full mb-3"
                  >
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    Open Template Sheet
                  </Button>
                  <div className="space-y-2 text-sm text-blue-800">
                    <p><strong>Steps:</strong></p>
                    <ol className="list-decimal list-inside space-y-1">
                      <li>Click "Open Template Sheet" above</li>
                      <li>Go to File → Make a copy</li>
                      <li>Replace example data with your websites</li>
                      <li>Share → Anyone with the link → Viewer</li>
                      <li>Copy the URL and paste it below</li>
                    </ol>
                  </div>
                </div>
                <div>
                  <Label htmlFor="google-sheet-url">Google Sheets URL</Label>
                  <Input
                    id="google-sheet-url"
                    placeholder="https://docs.google.com/spreadsheets/d/..."
                    value={googleSheetUrl}
                    onChange={(e) => setGoogleSheetUrl(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Make sure your sheet is publicly accessible (Anyone with the link can view)
                  </p>
                </div>
                <Button onClick={handleGoogleSheetImport} disabled={!googleSheetUrl || loading}>
                  <Link className="h-4 w-4 mr-2" />
                  {loading ? 'Loading Data...' : 'Load Google Sheets Data'}
                  {loading && <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full ml-2"></div>}
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        )}

        {step === 'mapping' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Map Columns</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Map your file columns to the required fields. Fields marked with * are required.
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              {Object.entries(mapping).map(([field, value]) => (
                <div key={field}>
                  <Label htmlFor={field}>
                    {field.replace('_', ' ').charAt(0).toUpperCase() + field.replace('_', ' ').slice(1)}
                    {['domain', 'price'].includes(field) && <span className="text-destructive">*</span>}
                  </Label>
                  <select
                    id={field}
                    className="w-full p-2 border rounded-md"
                    value={value}
                    onChange={(e) => setMapping(prev => ({ ...prev, [field]: e.target.value }))}
                  >
                    <option value="none">-- Select Column --</option>
                    {availableColumns.map(col => (
                      <option key={col} value={col}>{col}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
            
            <div className="flex gap-4">
              <Button onClick={() => setStep('upload')} variant="outline">
                Back
              </Button>
              <Button onClick={handlePreview}>
                Preview
              </Button>
            </div>
          </div>
        )}

        {step === 'admin_tags' && isSystemAdmin && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Tag className="h-5 w-5" />
                Admin Tagging
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Select an admin tag for this import batch. This tag will be applied to all imported websites for categorization and management.
              </p>
            </div>

            <div className="max-w-md">
              <Label className="text-base font-medium mb-3 block">Choose Import Tag</Label>
              <RadioGroup
                value={selectedAdminTag}
                onValueChange={setSelectedAdminTag}
                className="space-y-3"
              >
                <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer">
                  <RadioGroupItem value="moody" id="moody" />
                  <div className="flex-1">
                    <Label htmlFor="moody" className="cursor-pointer font-medium">
                      Moody
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Websites from Moody Media partnerships
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer">
                  <RadioGroupItem value="Partnerdeal" id="partnerdeal" />
                  <div className="flex-1">
                    <Label htmlFor="partnerdeal" className="cursor-pointer font-medium">
                      Partnerdeal
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Partner deal websites and special arrangements
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer">
                  <RadioGroupItem value="bm" id="bm" />
                  <div className="flex-1">
                    <Label htmlFor="bm" className="cursor-pointer font-medium">
                      BM
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Black Market or special category websites
                    </p>
                  </div>
                </div>
              </RadioGroup>

              {selectedAdminTag && (
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="text-sm text-blue-800">
                    <strong>Selected:</strong> <Badge variant="secondary">{selectedAdminTag}</Badge>
                  </div>
                  <div className="text-xs text-blue-600 mt-1">
                    All {parsedData.length} websites in this import will be tagged with "{selectedAdminTag}"
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-4">
              <Button onClick={() => setStep('mapping')} variant="outline">
                Back
              </Button>
              <Button onClick={handleAdminTagsNext}>
                Continue to Preview
              </Button>
            </div>
          </div>
        )}

        {step === 'preview' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Preview Import</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Review the first 5 rows before importing. Run a dry run to check for errors.
              </p>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-border">
                <thead>
                  <tr className="bg-muted">
                    <th className="border border-border p-2 text-left">Domain</th>
                    <th className="border border-border p-2 text-left">Price</th>
                    <th className="border border-border p-2 text-left">Country</th>
                    <th className="border border-border p-2 text-left">Language</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedData.slice(0, 5).map((row, index) => (
                    <tr key={index}>
                      <td className="border border-border p-2">{row[mapping.domain]}</td>
                      <td className="border border-border p-2">{row[mapping.price]}</td>
                      <td className="border border-border p-2">{row[mapping.country]}</td>
                      <td className="border border-border p-2">{row[mapping.language]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="flex gap-4">
              <Button onClick={() => setStep(isSystemAdmin ? 'admin_tags' : 'mapping')} variant="outline">
                Back
              </Button>
              <Button onClick={() => handleImport(true)} variant="outline" disabled={loading}>
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Dry Run
              </Button>
              <Button onClick={() => handleImport(false)} disabled={loading}>
                Import Now
              </Button>
            </div>
          </div>
        )}

        {step === 'results' && importResults && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Import Results</h3>
              <div className="grid grid-cols-3 gap-4 mb-6">
                <Card>
                  <CardContent className="p-4 text-center">
                    <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-green-600">{importResults.succeeded}</div>
                    <div className="text-sm text-muted-foreground">Successful</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <XCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-red-600">{importResults.failed}</div>
                    <div className="text-sm text-muted-foreground">Failed</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <AlertCircle className="h-8 w-8 text-blue-500 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-blue-600">{importResults.total_rows}</div>
                    <div className="text-sm text-muted-foreground">Total Rows</div>
                  </CardContent>
                </Card>
              </div>
              
              <Progress value={(importResults.succeeded / importResults.total_rows) * 100} className="mb-4" />
            </div>
            
            {importResults.failed > 0 && (
              <div>
                <h4 className="font-semibold mb-2">Errors</h4>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {importResults.results.filter(r => !r.success).slice(0, 10).map((result, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 bg-red-50 rounded">
                      <XCircle className="h-4 w-4 text-red-500" />
                      <span className="text-sm">
                        Row {result.row}: {result.domain} - {result.errors.join(', ')}
                      </span>
                    </div>
                  ))}
                </div>
                {importResults.failed > 10 && (
                  <p className="text-sm text-muted-foreground mt-2">
                    And {importResults.failed - 10} more errors...
                  </p>
                )}
              </div>
            )}
            
            <div className="flex gap-4">
              <Button onClick={resetImport} variant="outline">
                Start New Import
              </Button>
              {importResults.failed > 0 && (
                <Button onClick={downloadErrorReport} variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Download Error Report
                </Button>
              )}
            </div>
          </div>
        )}

        {loading && (
          <div className="text-center py-8">
            <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-muted-foreground">Processing...</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}