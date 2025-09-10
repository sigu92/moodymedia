import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ExternalLink, FileSpreadsheet, Link, Info, CheckCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface GoogleSheetsImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete: () => void;
}

export function GoogleSheetsImportModal({ open, onOpenChange, onImportComplete }: GoogleSheetsImportModalProps) {
  const [googleSheetUrl, setGoogleSheetUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'guide' | 'import' | 'preview' | 'validation' | 'processing'>('guide');
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [mapping, setMapping] = useState<any>({});
  const [validationResults, setValidationResults] = useState<any>(null);

  const templateSheetUrl = "https://docs.google.com/spreadsheets/d/1F2q-150o3hpBa1qBNndVfiDJobn5xWKfnVAAHUnLEvk/edit?gid=0#gid=0";

  const handleFetchData = async () => {
    if (!googleSheetUrl.trim()) {
      toast.error('Please enter a valid Google Sheets URL');
      return;
    }

    setLoading(true);

    try {
      // Extract spreadsheet ID from URL
      const sheetIdMatch = googleSheetUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
      if (!sheetIdMatch) {
        throw new Error('Invalid Google Sheets URL');
      }

      const sheetId = sheetIdMatch[1];
      const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=0`;

      // Fetch CSV data from Google Sheets
      const response = await fetch(csvUrl);
      if (!response.ok) {
        throw new Error('Failed to fetch Google Sheets data. Make sure the sheet is publicly accessible.');
      }

      const csvText = await response.text();
      const lines = csvText.split('\n').filter(line => line.trim());
      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
      
      // Parse rows
      const data = lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
        const row: any = {};
        headers.forEach((header, index) => {
          row[header] = values[index] || '';
        });
        return row;
      });

      // Create mapping based on expected columns
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

      setParsedData(data);
      setMapping(autoMapping);
      setStep('preview');
      toast.success(`Successfully loaded ${data.length} rows from Google Sheets`);
    } catch (error) {
      console.error('Fetch error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to fetch from Google Sheets');
    } finally {
      setLoading(false);
    }
  };

  const handleValidate = async () => {
    setLoading(true);
    
    try {
      // Call import function with dry_run = true
      const { data: result, error } = await supabase.functions.invoke('publisher-import-batch', {
        body: {
          source: 'google_sheet',
          data: parsedData,
          mapping: mapping,
          dry_run: true,
        },
      });

      if (error) throw error;

      setValidationResults(result);
      setStep('validation');
      toast.success('Validation completed successfully');
    } catch (error) {
      console.error('Validation error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to validate data');
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    setLoading(true);
    setStep('processing');
    
    try {
      // Call import function with dry_run = false
      const { data: importResult, error } = await supabase.functions.invoke('publisher-import-batch', {
        body: {
          source: 'google_sheet',
          data: parsedData,
          mapping: mapping,
          dry_run: false,
        },
      });

      if (error) throw error;

      toast.success(`Successfully imported ${importResult.succeeded} websites!`);
      onImportComplete();
      onOpenChange(false);
      resetModal();
    } catch (error) {
      console.error('Import error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to import from Google Sheets');
      setStep('validation');
    } finally {
      setLoading(false);
    }
  };

  const resetModal = () => {
    setStep('guide');
    setGoogleSheetUrl('');
    setParsedData([]);
    setMapping({});
    setValidationResults(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Import from Google Sheets
          </DialogTitle>
        </DialogHeader>

        {step === 'guide' && (
          <div className="space-y-6">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Follow these steps to import your websites from Google Sheets to Moody Media platform.
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <span className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-sm">1</span>
                    Use Our Template
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Start with our pre-built Google Sheets template that has all the required columns.
                  </p>
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
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    In Google Sheets, go to File → Make a copy to create your own editable version.
                  </p>
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
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Replace the example data with your actual website information. Keep the column headers unchanged.
                  </p>
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
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Make your sheet publicly accessible for import.
                  </p>
                  <div className="bg-muted p-3 rounded-lg space-y-1">
                    <p className="text-xs font-mono">Share → Anyone with the link → Viewer</p>
                    <p className="text-xs text-muted-foreground">Or use "Anyone on the internet with this link can view"</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="flex gap-4">
              <Button 
                onClick={() => setStep('import')}
                className="flex-1"
              >
                <Link className="h-4 w-4 mr-2" />
                Import My Sheet
              </Button>
              <Button 
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {step === 'import' && (
          <div className="space-y-6">
            <div>
              <Label htmlFor="sheet-url">Google Sheets URL</Label>
              <Input
                id="sheet-url"
                placeholder="https://docs.google.com/spreadsheets/d/..."
                value={googleSheetUrl}
                onChange={(e) => setGoogleSheetUrl(e.target.value)}
                className="mt-2"
              />
              <p className="text-sm text-muted-foreground mt-2">
                Paste the full URL of your Google Sheet here
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
        )}

        {step === 'preview' && (
          <div className="space-y-6">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Review your data below. We found {parsedData.length} rows and auto-mapped columns.
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Data Preview ({parsedData.length} rows)</h3>
              <div className="max-h-96 overflow-auto border rounded-lg">
                <table className="w-full border-collapse text-sm">
                  <thead className="bg-muted sticky top-0">
                    <tr>
                      <th className="border p-2 text-left font-medium">Domain</th>
                      <th className="border p-2 text-left font-medium">Category</th>
                      <th className="border p-2 text-left font-medium">Price</th>
                      <th className="border p-2 text-left font-medium">Country</th>
                      <th className="border p-2 text-left font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedData.slice(0, 10).map((row, index) => (
                      <tr key={index} className="hover:bg-muted/50">
                        <td className="border p-2">{row[mapping.domain] || '-'}</td>
                        <td className="border p-2">{row[mapping.category] || '-'}</td>
                        <td className="border p-2">{row[mapping.currency]} {row[mapping.price] || '-'}</td>
                        <td className="border p-2">{row[mapping.country] || '-'}</td>
                        <td className="border p-2">
                          {row[mapping.domain] && row[mapping.price] && row[mapping.country] ? (
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
                onClick={() => setStep('import')}
                variant="outline"
              >
                Back
              </Button>
              <Button 
                onClick={handleValidate}
                disabled={loading}
                className="flex-1"
                variant="outline"
              >
                {loading ? 'Validating...' : 'Validate Data'}
              </Button>
            </div>
          </div>
        )}

        {step === 'validation' && validationResults && (
          <div className="space-y-6">
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
                  <Info className="h-4 w-4 text-blue-500 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-blue-600">{validationResults.skipped}</div>
                  <div className="text-sm text-muted-foreground">Skipped</div>
                </CardContent>
              </Card>
            </div>

            {validationResults.failed > 0 && (
              <div className="space-y-2">
                <h4 className="font-semibold text-red-600">Validation Errors</h4>
                <div className="max-h-60 overflow-y-auto space-y-2">
                  {validationResults.results.filter((r: any) => !r.success).slice(0, 10).map((result: any, index: number) => (
                    <div key={index} className="flex items-start gap-2 p-3 bg-red-50 rounded border border-red-200">
                      <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                      <div className="text-sm">
                        <span className="font-medium">Row {result.row}: {result.domain}</span>
                        <ul className="list-disc list-inside text-red-700 mt-1">
                          {result.errors.map((error: string, errorIndex: number) => (
                            <li key={errorIndex}>{error}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ))}
                </div>
                {validationResults.failed > 10 && (
                  <p className="text-sm text-muted-foreground">
                    And {validationResults.failed - 10} more errors...
                  </p>
                )}
              </div>
            )}

            <div className="flex gap-4">
              <Button 
                onClick={() => setStep('preview')}
                variant="outline"
              >
                Back to Preview
              </Button>
              {validationResults.succeeded > 0 && (
                <Button 
                  onClick={handleImport}
                  disabled={loading}
                  className="flex-1"
                >
                  {loading ? 'Importing...' : `Import ${validationResults.succeeded} Valid Sites`}
                </Button>
              )}
            </div>
          </div>
        )}

        {step === 'processing' && (
          <div className="text-center py-12">
            <div className="animate-spin h-12 w-12 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
            <h3 className="text-lg font-semibold mb-2">Importing your websites...</h3>
            <p className="text-muted-foreground">This may take a few moments depending on the size of your sheet.</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}