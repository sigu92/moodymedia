import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Copy, Share2, Mail, MessageCircle, Download } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface ReferralShareProps {
  referralCode: string;
  onCopy: (medium?: string) => string;
  generateSocialLinks: () => {
    twitter: string;
    linkedin: string;
    facebook: string;
    email: string;
  };
}

export const ReferralShare = ({ referralCode, onCopy, generateSocialLinks }: ReferralShareProps) => {
  const [customMessage, setCustomMessage] = useState(
    "🚀 I've been using this amazing SEO marketplace to get high-quality backlinks. Join using my referral code and get 10% off your first order!"
  );

  const baseUrl = window.location.origin;
  const referralLink = `${baseUrl}/?ref=${referralCode}`;
  
  const socialLinks = generateSocialLinks();

  const copyCustomMessage = () => {
    const fullMessage = `${customMessage}\n\nUse my referral link: ${referralLink}`;
    navigator.clipboard.writeText(fullMessage);
    toast({
      title: "Copied!",
      description: "Custom message copied to clipboard",
    });
  };

  const downloadReferralKit = () => {
    const content = `
# Referral Kit for ${referralCode}

## Your Referral Link
${referralLink}

## Sample Messages

### Email Template
Subject: Exclusive SEO Marketplace Invitation

Hi [Name],

I've been using this fantastic SEO marketplace to grow my online presence and wanted to share it with you. They offer high-quality backlinks from verified media outlets with transparent pricing.

As a special offer, you can get 10% off your first order using my referral link: ${referralLink}

The platform features:
- 100+ verified media outlets
- Transparent pricing and metrics
- Secure order management
- Real publisher relationships

Hope this helps with your SEO goals!

Best regards,
[Your Name]

### Social Media Post
🚀 Found an amazing SEO marketplace with transparent backlink pricing and verified publishers! 

✅ Real metrics (Ahrefs DR, Moz DA, etc.)
✅ Secure order management
✅ Direct publisher relationships

Get 10% off your first order: ${referralLink}

#SEO #DigitalMarketing #Backlinks

### WhatsApp/Slack Message
Hey! I've been using this SEO marketplace for backlinks and it's been game-changing. Real publishers, transparent metrics, fair pricing.

You can get 10% off your first order with my link: ${referralLink}

Worth checking out if you're working on SEO!
`;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `referral-kit-${referralCode}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Downloaded!",
      description: "Referral kit downloaded successfully",
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Share2 className="h-5 w-5" />
          Share & Earn
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        <Tabs defaultValue="links" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="links">Quick Share</TabsTrigger>
            <TabsTrigger value="custom">Custom Message</TabsTrigger>
            <TabsTrigger value="kit">Referral Kit</TabsTrigger>
          </TabsList>

          <TabsContent value="links" className="space-y-4">
            <div>
              <Label htmlFor="referral-link">Your Referral Link</Label>
              <div className="flex gap-2 mt-2">
                <Input
                  id="referral-link"
                  value={referralLink}
                  readOnly
                  className="text-sm"
                />
                <Button variant="outline" onClick={() => onCopy('general')}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                className="justify-start"
                onClick={() => window.open(socialLinks.twitter, '_blank')}
              >
                <MessageCircle className="h-4 w-4 mr-2" />
                Twitter
              </Button>
              
              <Button
                variant="outline"
                className="justify-start"
                onClick={() => window.open(socialLinks.linkedin, '_blank')}
              >
                <Share2 className="h-4 w-4 mr-2" />
                LinkedIn
              </Button>
              
              <Button
                variant="outline"
                className="justify-start"
                onClick={() => window.open(socialLinks.facebook, '_blank')}
              >
                <Share2 className="h-4 w-4 mr-2" />
                Facebook
              </Button>
              
              <Button
                variant="outline"
                className="justify-start"
                onClick={() => window.open(socialLinks.email, '_blank')}
              >
                <Mail className="h-4 w-4 mr-2" />
                Email
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="custom" className="space-y-4">
            <div>
              <Label htmlFor="custom-message">Personalize Your Message</Label>
              <textarea
                id="custom-message"
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                className="w-full mt-2 p-3 border rounded-md resize-none"
                rows={4}
                placeholder="Write your personal message..."
              />
            </div>
            
            <Button onClick={copyCustomMessage} className="w-full">
              <Copy className="h-4 w-4 mr-2" />
              Copy Custom Message
            </Button>
          </TabsContent>

          <TabsContent value="kit" className="space-y-4">
            <div className="text-sm text-muted-foreground space-y-2">
              <p>Download a complete referral kit with:</p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Email templates</li>
                <li>Social media posts</li>
                <li>WhatsApp/Slack messages</li>
                <li>Your referral link</li>
              </ul>
            </div>
            
            <Button onClick={downloadReferralKit} className="w-full">
              <Download className="h-4 w-4 mr-2" />
              Download Referral Kit
            </Button>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};