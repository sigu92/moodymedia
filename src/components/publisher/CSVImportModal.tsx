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
  accept_casino?: boolean;
  casino_multiplier?: number;
  accept_loans?: boolean;
  loans_multiplier?: number;
  accept_adult?: boolean;
  adult_multiplier?: number;
  accept_dating?: boolean;
  dating_multiplier?: number;
  accept_cbd?: boolean;
  cbd_multiplier?: number;
  accept_crypto?: boolean;
  crypto_multiplier?: number;
  accept_forex?: boolean;
  forex_multiplier?: number;
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

  const csvTemplate = `domain,category,price,currency,country,language,lead_time_days,guidelines,niches,is_active,accepts_no_license_status,sponsor_tag_status,sponsor_tag_type,sale_price,sale_note,accept_casino,casino_multiplier,accept_loans,loans_multiplier,accept_adult,adult_multiplier,accept_dating,dating_multiplier,accept_cbd,cbd_multiplier,accept_crypto,crypto_multiplier,accept_forex,forex_multiplier
example1.com,Blog,250,EUR,SE,Swedish,7,"No adult content, quality articles only","Technology,Health",true,no,yes,text,200,"Limited time offer",true,2.0,false,1.0,false,1.0,true,1.5,false,1.0,false,1.0,false,1.0
example2.com,News,300,EUR,NO,Norwegian,5,"Follow editorial guidelines","Business,Finance",true,depends,no,text,,,false,1.0,true,1.8,false,1.0,false,1.0,false,1.0,true,1.5,true,1.8`;

  const downloadTemplate = () => {
    const blob = new Blob([csvTemplate], { type: 'text/csv' });
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
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        toast.error('CSV file must contain at least a header and one data row');
        return;
      }

      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      const requiredHeaders = ['domain', 'category', 'price', 'currency', 'country', 'language'];
      
      const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
      if (missingHeaders.length > 0) {
        toast.error(`Missing required columns: ${missingHeaders.join(', ')}`);
        return;
      }

      const data: ImportRow[] = lines.slice(1).map((line, index) => {
        const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
        const row: any = {};
        
        headers.forEach((header, i) => {
          row[header] = values[i] || '';
        });

        return {
          domain: row.domain,
          category: row.category,
          price: parseFloat(row.price) || 0,
          currency: row.currency || 'EUR',
          country: row.country,
          language: row.language,
          lead_time_days: parseInt(row.lead_time_days) || 7,
          guidelines: row.guidelines || '',
          niches: row.niches || '',
          is_active: row.is_active === 'true' || row.is_active === '1',
          accepts_no_license_status: row.accepts_no_license_status || 'no',
          sponsor_tag_status: row.sponsor_tag_status || 'no',
          sponsor_tag_type: row.sponsor_tag_type || 'text',
          sale_price: row.sale_price ? parseFloat(row.sale_price) : undefined,
          sale_note: row.sale_note || '',
          accept_casino: row.accept_casino === 'true' || row.accept_casino === '1',
          casino_multiplier: row.casino_multiplier ? parseFloat(row.casino_multiplier) : 2.0,
          accept_loans: row.accept_loans === 'true' || row.accept_loans === '1',
          loans_multiplier: row.loans_multiplier ? parseFloat(row.loans_multiplier) : 1.8,
          accept_adult: row.accept_adult === 'true' || row.accept_adult === '1',
          adult_multiplier: row.adult_multiplier ? parseFloat(row.adult_multiplier) : 1.5,
          accept_dating: row.accept_dating === 'true' || row.accept_dating === '1',
          dating_multiplier: row.dating_multiplier ? parseFloat(row.dating_multiplier) : 1.5,
          accept_cbd: row.accept_cbd === 'true' || row.accept_cbd === '1',
          cbd_multiplier: row.cbd_multiplier ? parseFloat(row.cbd_multiplier) : 1.5,
          accept_crypto: row.accept_crypto === 'true' || row.accept_crypto === '1',
          crypto_multiplier: row.crypto_multiplier ? parseFloat(row.crypto_multiplier) : 1.5,
          accept_forex: row.accept_forex === 'true' || row.accept_forex === '1',
          forex_multiplier: row.forex_multiplier ? parseFloat(row.forex_multiplier) : 1.8
        };
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
      if (!row.price || row.price <= 0) rowErrors.push('Price must be greater than 0');
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
      if (!file) {
        throw new Error('No file selected');
      }

      const csvText = await file.text();
      
      // Parse CSV
      const lines = csvText.split('\n').filter(line => line.trim());
      if (lines.length < 2) {
        throw new Error('CSV appears to be empty or has no data rows');
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
      const mapping: any = {};
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
            mapping[field] = foundHeader;
            break;
          }
        }
      });
      
      // Call the import function
      const { data, error } = await supabase.functions.invoke('publisher-import-batch', {
        body: {
          source: 'csv',
          data: rows,
          mapping: mapping,
          dry_run: false
        }
      });
      
      if (error) throw error;
      
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
                  <CardTitle className="text-red-600">Validation Errors</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Domain</TableHead>
                        <TableHead>Errors</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {errorRows.map((row, index) => (
                        <TableRow key={index}>
                          <TableCell>{row.domain || 'N/A'}</TableCell>
                          <TableCell>
                            {row.errors?.map((error, i) => (
                              <Badge key={i} variant="destructive" className="mr-1">
                                {error}
                              </Badge>
                            ))}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
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