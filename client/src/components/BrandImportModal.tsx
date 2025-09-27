import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useProject } from '@/store/useProject';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import type { BrandImportResult } from '@shared/schema';
import ColorSwatches from './ColorSwatches';

interface BrandImportModalProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export default function BrandImportModal({ open: controlledOpen, onOpenChange }: BrandImportModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [url, setUrl] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [previewData, setPreviewData] = useState<BrandImportResult | null>(null);
  
  const { updateBrand } = useProject();
  const { toast } = useToast();

  const open_ = controlledOpen !== undefined ? controlledOpen : isOpen;
  const setOpen = onOpenChange || setIsOpen;

  const handleImport = async () => {
    const trimmedUrl = url.trim();
    if (!trimmedUrl) {
      toast({
        title: "URL required",
        description: "Please enter a website URL to import brand colors and fonts.",
        variant: "destructive",
      });
      return;
    }

    setIsImporting(true);
    try {
      const response = await apiRequest('GET', `/api/brand/scrape?url=${encodeURIComponent(trimmedUrl)}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to import brand');
      }
      
      const data: BrandImportResult = await response.json();
      
      setPreviewData(data);
      
      toast({
        title: "Brand imported successfully",
        description: `Found ${data.palette.length} colors and font information from ${trimmedUrl}.`,
      });
    } catch (error: any) {
      console.error('Brand import error:', error);
      
      // Extract the actual error message from the response
      let errorMessage = error.message || "Unable to import brand. Please check the URL and try again.";
      
      toast({
        title: "Import failed",
        description: errorMessage,
        variant: "destructive",
      });
      
      // Only set fallback data if it's not a validation error
      if (!errorMessage.includes('valid website URL')) {
        setPreviewData({
          palette: ['#1f2937', '#3b82f6', '#10b981', '#f59e0b', '#ef4444'],
          fonts: {
            headings: 'Inter',
            body: 'Inter',
            sources: [],
          },
          evidence: {
            themeColor: null,
            cssVars: [],
            googleFonts: [],
            imagesUsedForPalette: [],
            screenshotUsed: false,
          }
        });
      }
    } finally {
      setIsImporting(false);
    }
  };

  const handleApply = () => {
    if (!previewData) return;

    updateBrand({
      palette: previewData.palette,
      headings: previewData.fonts.headings || 'Inter',
      body: previewData.fonts.body || 'Inter',
      fonts: Array.from(new Set([
        previewData.fonts.headings || 'Inter',
        previewData.fonts.body || 'Inter',
      ])),
    });

    // Inject Google Fonts if available
    if (previewData.fonts.sources.length > 0) {
      previewData.fonts.sources.forEach(fontUrl => {
        if (fontUrl.includes('fonts.googleapis.com')) {
          const existingLink = document.querySelector(`link[href="${fontUrl}"]`);
          if (!existingLink) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = fontUrl;
            document.head.appendChild(link);
          }
        }
      });
    }

    toast({
      title: "Brand applied",
      description: "Your project has been updated with the new brand colors and fonts.",
    });

    setOpen(false);
    setPreviewData(null);
    setUrl('');
  };

  const handleCancel = () => {
    setOpen(false);
    setPreviewData(null);
    setUrl('');
  };

  return (
    <Dialog open={open_} onOpenChange={setOpen}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto" data-testid="brand-import-modal">
        <DialogHeader>
          <DialogTitle>Import Brand from URL</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="brand-url">Website URL</Label>
            <div className="flex gap-2 mt-2">
              <Input
                id="brand-url"
                type="url"
                placeholder="Enter URL like google.com or https://stripe.com"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="flex-1"
                data-testid="input-brand-url"
              />
              <Button 
                onClick={handleImport} 
                disabled={isImporting || !url.trim()}
                data-testid="button-import-brand"
              >
                {isImporting ? 'Importing...' : 'Import'}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Enter any website URL. We'll automatically extract brand colors and fonts. No need to include "https://" - we'll add it for you.
            </p>
          </div>

          {previewData && (
            <div className="border border-border rounded-lg p-4">
              <h3 className="text-sm font-medium mb-3">Brand Preview</h3>
              
              <div className="mb-4">
                <h4 className="text-xs font-medium text-muted-foreground mb-2">Color Palette</h4>
                <div className="grid grid-cols-8 gap-2">
                  {previewData.palette.map((color, index) => (
                    <div key={index} className="space-y-1">
                      <div 
                        className="w-8 h-8 rounded-md border border-border"
                        style={{ backgroundColor: color }}
                      />
                      <div className="text-xs text-center font-mono">
                        {color.toUpperCase()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-xs font-medium text-muted-foreground mb-2">Typography</h4>
                <div className="space-y-2">
                  <div 
                    className="text-lg font-bold"
                    style={{ fontFamily: previewData.fonts.headings || 'Inter' }}
                  >
                    Heading Font - {previewData.fonts.headings || 'Inter'} Bold
                  </div>
                  <div 
                    className="text-sm"
                    style={{ fontFamily: previewData.fonts.body || 'Inter' }}
                  >
                    Body text font - {previewData.fonts.body || 'Inter'} Regular for readable content
                  </div>
                </div>
              </div>

              {previewData.evidence && (
                <div className="mt-4 pt-4 border-t border-border">
                  <h4 className="text-xs font-medium text-muted-foreground mb-2">Evidence</h4>
                  <div className="text-xs text-muted-foreground space-y-1">
                    {previewData.evidence.themeColor && (
                      <div>Theme color: {previewData.evidence.themeColor}</div>
                    )}
                    {previewData.evidence.cssVars.length > 0 && (
                      <div>CSS variables: {previewData.evidence.cssVars.length} found</div>
                    )}
                    {previewData.evidence.googleFonts.length > 0 && (
                      <div>Google Fonts: {previewData.evidence.googleFonts.join(', ')}</div>
                    )}
                    {previewData.evidence.imagesUsedForPalette.length > 0 && (
                      <div>Colors extracted from {previewData.evidence.imagesUsedForPalette.length} images</div>
                    )}
                    {previewData.evidence.screenshotUsed && (
                      <div>Screenshot analysis: Used</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex gap-3 justify-end pt-4">
            <Button 
              variant="outline" 
              onClick={handleCancel}
              data-testid="button-cancel-import"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleApply} 
              disabled={!previewData}
              data-testid="button-apply-brand"
            >
              Apply Brand
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
