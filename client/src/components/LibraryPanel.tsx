import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Upload, Search, Trash2, ImageIcon, Plus } from 'lucide-react';
import { ObjectUploader } from './ObjectUploader';
import type { Asset } from '@shared/schema';
import { useProject } from '@/store/useProject';
import { nanoid } from 'nanoid';

export default function LibraryPanel() {
  const { toast } = useToast();
  const { addElement } = useProject();
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch assets from the API
  const { 
    data: assets = [], 
    isLoading, 
    error 
  } = useQuery<Asset[]>({
    queryKey: ['/api/assets'],
  });

  // Filter assets based on search term
  const filteredAssets = assets.filter(asset =>
    asset.filename.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async ({ uploadURL, file }: { uploadURL: string; file: File }) => {
      // First, upload the file to the presigned URL
      const uploadResponse = await fetch(uploadURL, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        },
      });

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload file');
      }

      // Get image dimensions if it's an image
      let width: number | undefined;
      let height: number | undefined;
      
      if (file.type.startsWith('image/')) {
        const img = new Image();
        const imageUrl = URL.createObjectURL(file);
        await new Promise((resolve, reject) => {
          img.onload = () => {
            width = img.naturalWidth;
            height = img.naturalHeight;
            URL.revokeObjectURL(imageUrl);
            resolve(void 0);
          };
          img.onerror = reject;
          img.src = imageUrl;
        });
      }

      // Then, save the asset metadata to our API
      const assetData = {
        filename: file.name,
        fileType: file.type,
        fileSize: file.size,
        objectPath: uploadURL, // Use the upload URL as the object path initially
        width,
        height,
      };

      const response = await apiRequest('POST', '/api/assets', assetData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/assets'] });
      toast({
        title: 'Upload successful',
        description: 'Asset has been added to your library',
      });
    },
    onError: (error: any) => {
      console.error('Upload error:', error);
      toast({
        title: 'Upload failed',
        description: error.message || 'Failed to upload asset',
        variant: 'destructive',
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (assetId: string) => {
      const response = await apiRequest('DELETE', `/api/assets/${assetId}`);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/assets'] });
      toast({
        title: 'Asset deleted',
        description: 'Asset has been removed from your library',
      });
    },
    onError: (error: any) => {
      console.error('Delete error:', error);
      toast({
        title: 'Delete failed',
        description: error.message || 'Failed to delete asset',
        variant: 'destructive',
      });
    },
  });

  // Handle getting upload parameters
  const handleGetUploadParameters = async () => {
    const response = await apiRequest('POST', '/api/assets/upload');
    const data = await response.json();
    return {
      method: 'PUT' as const,
      url: data.uploadURL,
    };
  };

  // Handle upload completion
  const handleUploadComplete = (result: any) => {
    if (result.successful && result.successful.length > 0) {
      const file = result.successful[0];
      const uploadURL = file.uploadURL;
      const originalFile = file.data as File;

      uploadMutation.mutate({ uploadURL, file: originalFile });
    }
  };

  // Handle adding asset to canvas
  const handleAddToCanvas = (asset: Asset) => {
    if (!asset.width || !asset.height) {
      toast({
        title: 'Cannot add asset',
        description: 'Asset dimensions are not available',
        variant: 'destructive',
      });
      return;
    }

    // Create image element from asset
    const newImage = {
      id: nanoid(),
      type: 'image' as const,
      src: `${window.location.origin}${asset.objectPath}`, // Full URL for reliable loading
      x: 540, // Center of 1080x1080 canvas
      y: 540,
      width: Math.min(asset.width, 400), // Limit initial size
      height: Math.min(asset.height, 400),
      rotation: 0,
      z: 0,
      opacity: 1,
    };

    addElement(newImage);
    
    toast({
      title: 'Asset added',
      description: 'Image has been added to the current scene',
    });
  };

  return (
    <div className="p-4 space-y-4" data-testid="library-panel">
      {/* Upload Area */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">Asset Library</h3>
          <ObjectUploader
            maxNumberOfFiles={1}
            maxFileSize={10485760} // 10MB
            allowedFileTypes={['image/*']}
            onGetUploadParameters={handleGetUploadParameters}
            onComplete={handleUploadComplete}
            buttonVariant="outline"
            buttonSize="sm"
            disabled={uploadMutation.isPending}
          >
            <Plus className="w-4 h-4 mr-2" />
            Upload
          </ObjectUploader>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search assets..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
            data-testid="input-asset-search"
          />
        </div>
      </div>

      {/* Assets Grid */}
      <ScrollArea className="h-96">
        {isLoading ? (
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="aspect-square">
                <CardContent className="p-0 h-full flex items-center justify-center">
                  <div className="w-8 h-8 animate-pulse bg-muted rounded" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : error ? (
          <div className="text-center text-muted-foreground py-8">
            <ImageIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>Failed to load assets</p>
          </div>
        ) : filteredAssets.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <ImageIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
            {searchTerm ? (
              <p>No assets found for "{searchTerm}"</p>
            ) : (
              <div>
                <p className="mb-2">No assets uploaded yet</p>
                <p className="text-xs">Upload your first image to get started</p>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filteredAssets.map((asset) => (
              <Card 
                key={asset.id} 
                className="aspect-square group cursor-pointer transition-all hover:shadow-md"
                onClick={() => handleAddToCanvas(asset)}
                data-testid={`asset-${asset.id}`}
              >
                <CardContent className="p-2 h-full flex flex-col">
                  {/* Image Preview */}
                  <div className="flex-1 rounded-md bg-muted flex items-center justify-center overflow-hidden">
                    {asset.fileType.startsWith('image/') ? (
                      <img 
                        src={`${window.location.origin}${asset.objectPath}`}
                        alt={asset.filename}
                        className="w-full h-full object-cover rounded-md"
                        onError={(e) => {
                          // Fallback if image fails to load
                          const img = e.target as HTMLImageElement;
                          img.style.display = 'none';
                          const parent = img.parentElement;
                          if (parent) {
                            parent.innerHTML = '<div class="w-8 h-8 text-muted-foreground"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg></div>';
                          }
                        }}
                      />
                    ) : (
                      <ImageIcon className="w-8 h-8 text-muted-foreground" />
                    )}
                  </div>
                  
                  {/* Asset Info */}
                  <div className="mt-2 space-y-1">
                    <p className="text-xs font-medium truncate" title={asset.filename}>
                      {asset.filename}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        {asset.width && asset.height ? `${asset.width}×${asset.height}` : 'Unknown size'}
                      </span>
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={(e) => {
                                e.stopPropagation();
                              }}
                              data-testid={`button-delete-asset-${asset.id}`}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Asset</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete "{asset.filename}"? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteMutation.mutate(asset.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </ScrollArea>

      {uploadMutation.isPending && (
        <div className="text-center text-sm text-muted-foreground">
          Processing upload...
        </div>
      )}
    </div>
  );
}