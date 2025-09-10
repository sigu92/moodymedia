import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { 
  Settings as SettingsIcon,
  User,
  Building,
  Mail,
  CheckCircle,
  AlertCircle,
  Save,
  Loader2,
  HelpCircle
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useSettingsStatus, updateSettings, type OrgSettings } from '@/hooks/useSettings';
import { toast } from '@/hooks/use-toast';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

// Form validation schema
const settingsSchema = z.object({
  name: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be less than 100 characters'),
  company_name: z.string()
    .min(2, 'Company name must be at least 2 characters')
    .max(150, 'Company name must be less than 150 characters'),
  primary_email: z.string()
    .email('Please enter a valid email address'),
  notification_email: z.string()
    .email('Please enter a valid email address'),
  orders_email: z.string()
    .email('Please enter a valid email address'),
});

type SettingsFormData = z.infer<typeof settingsSchema>;

const Settings: React.FC = () => {
  const { user } = useAuth();
  const { settings, isComplete, loading, refresh } = useSettingsStatus();
  const [saving, setSaving] = useState(false);

  const form = useForm<SettingsFormData>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      name: '',
      company_name: '',
      primary_email: '',
      notification_email: '',
      orders_email: '',
    },
  });

  const { watch, formState: { errors } } = form;
  const watchedValues = watch();

  // Calculate completion progress
  const getCompletionProgress = () => {
    const fields = ['name', 'company_name', 'primary_email', 'notification_email', 'orders_email'];
    const completedFields = fields.filter(field => {
      const value = watchedValues[field as keyof SettingsFormData];
      return value && value.trim().length > 0 && !errors[field as keyof SettingsFormData];
    });
    return (completedFields.length / fields.length) * 100;
  };

  const progress = getCompletionProgress();

  // Load existing settings into form
  useEffect(() => {
    if (settings) {
      form.reset({
        name: settings.name || '',
        company_name: settings.company_name || '',
        primary_email: settings.primary_email || '',
        notification_email: settings.notification_email || '',
        orders_email: settings.orders_email || '',
      });
    } else if (user) {
      // Pre-populate with user email if available
      form.reset({
        name: '',
        company_name: '',
        primary_email: user.email || '',
        notification_email: user.email || '',
        orders_email: user.email || '',
      });
    }
  }, [settings, user, form]);

  const onSubmit = async (data: SettingsFormData) => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to save settings",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const result = await updateSettings(user.id, data);
      
      if (result.success) {
        toast({
          title: "Settings Saved",
          description: "Your organization settings have been updated successfully.",
        });
        await refresh(); // Refresh the settings data
      } else {
        throw new Error(result.error || 'Failed to save settings');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save settings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAndClose = async (data: SettingsFormData) => {
    await onSubmit(data);
    // Could navigate back or close modal here
  };

  if (loading && !settings) {
    return (
      <div className="min-h-screen bg-background">
        <main className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
            <SettingsIcon className="h-8 w-8" />
            Organization Settings
          </h1>
          <p className="text-muted-foreground">
            Complete your organization details to enable all platform features
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Completion Status */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {isComplete ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-orange-600" />
                  )}
                  Completion Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Progress</span>
                    <span className="text-sm text-muted-foreground">{Math.round(progress)}%</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>
                
                <div className="space-y-2">
                  <Badge 
                    variant={isComplete ? "default" : "secondary"} 
                    className={isComplete ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100" : ""}
                  >
                    {isComplete ? "Complete" : "Incomplete"}
                  </Badge>
                  
                  {isComplete ? (
                    <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
                      <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                      <AlertDescription className="text-green-700 dark:text-green-300">
                        All required information is complete. You can now use all platform features.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <Alert className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950">
                      <AlertCircle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                      <AlertDescription className="text-orange-700 dark:text-orange-300">
                        Please fill in all required fields to enable notifications, orders, and uploads.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Settings Form */}
          <div className="lg:col-span-2">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Personal Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <User className="h-5 w-5" />
                      Personal Information
                    </CardTitle>
                    <CardDescription>
                      Your personal details for account management
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-1">
                            Name <span className="text-red-500">*</span>
                          </FormLabel>
                          <FormControl>
                            <Input placeholder="Your full name" {...field} />
                          </FormControl>
                          <FormDescription>
                            Your full name (2-100 characters)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                {/* Company Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Building className="h-5 w-5" />
                      Company Information
                    </CardTitle>
                    <CardDescription>
                      Organization details for billing and communication
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="company_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-1">
                            Company Name <span className="text-red-500">*</span>
                          </FormLabel>
                          <FormControl>
                            <Input placeholder="Your company name" {...field} />
                          </FormControl>
                          <FormDescription>
                            Legal company name (2-150 characters)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                {/* Email Configuration */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Mail className="h-5 w-5" />
                      Email Configuration
                    </CardTitle>
                    <CardDescription>
                      Configure email addresses for different types of communications
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="primary_email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-1">
                            Primary Email <span className="text-red-500">*</span>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger>
                                  <HelpCircle className="h-3 w-3 text-muted-foreground" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Main contact email for your account</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="your@email.com" {...field} />
                          </FormControl>
                          <FormDescription>
                            Primary contact email for account communications
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="notification_email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-1">
                            Notification Email <span className="text-red-500">*</span>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger>
                                  <HelpCircle className="h-3 w-3 text-muted-foreground" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Email for system notifications and alerts</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="notifications@company.com" {...field} />
                          </FormControl>
                          <FormDescription>
                            Email address for system notifications and alerts
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="orders_email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-1">
                            Orders Email <span className="text-red-500">*</span>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger>
                                  <HelpCircle className="h-3 w-3 text-muted-foreground" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Email for order confirmations and updates</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="orders@company.com" {...field} />
                          </FormControl>
                          <FormDescription>
                            Email address for order confirmations and updates
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button 
                    type="submit" 
                    disabled={saving}
                    className="flex-1"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Save Settings
                      </>
                    )}
                  </Button>
                  
                  <Button 
                    type="button"
                    variant="outline"
                    disabled={saving}
                    onClick={form.handleSubmit(handleSaveAndClose)}
                    className="flex-1"
                  >
                    Save & Close
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Settings;