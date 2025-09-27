// Simplified ObjectUploader to avoid Uppy dependency issues
import { useState } from "react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { X } from "lucide-react";

interface ObjectUploaderProps {
  maxNumberOfFiles?: number;
  maxFileSize?: number;
  allowedFileTypes?: string[];
  onGetUploadParameters: () => Promise<{
    method: "PUT";
    url: string;
  }>;
  onComplete?: (result: { successful: { uploadURL: string; data: File }[] }) => void;
  buttonVariant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  buttonSize?: "default" | "sm" | "lg" | "icon";
  buttonClassName?: string;
  children: ReactNode;
  disabled?: boolean;
}

/**
 * A simplified file upload component that renders as a shadcn button and provides a dialog
 * interface for file upload.
 * 
 * Features:
 * - Renders as a customizable shadcn Button that opens a file upload dialog
 * - Simple file selection and upload progress tracking
 * - Direct upload to presigned URLs
 * - Integrates seamlessly with our shadcn UI system
 * 
 * @param props - Component props
 * @param props.maxNumberOfFiles - Maximum number of files allowed to be uploaded (default: 1)
 * @param props.maxFileSize - Maximum file size in bytes (default: 10MB)
 * @param props.allowedFileTypes - Array of allowed MIME types (default: all images)
 * @param props.onGetUploadParameters - Function to get upload parameters (method and URL)
 * @param props.onComplete - Callback function called when upload is complete
 * @param props.buttonVariant - Shadcn button variant (default: "default")
 * @param props.buttonSize - Shadcn button size (default: "default")
 * @param props.buttonClassName - Optional CSS class name for the button
 * @param props.children - Content to be rendered inside the button
 * @param props.disabled - Whether the button should be disabled
 */
export function ObjectUploader({
  maxNumberOfFiles = 1,
  maxFileSize = 10485760, // 10MB default
  allowedFileTypes = ['image/*'],
  onGetUploadParameters,
  onComplete,
  buttonVariant = "default",
  buttonSize = "default", 
  buttonClassName,
  children,
  disabled = false,
}: ObjectUploaderProps) {
  const [showModal, setShowModal] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    
    // Validate file count
    if (files.length > maxNumberOfFiles) {
      setError(`Maximum ${maxNumberOfFiles} file(s) allowed`);
      return;
    }
    
    // Validate file size and type
    for (const file of files) {
      if (file.size > maxFileSize) {
        setError(`File ${file.name} is too large. Max size: ${Math.round(maxFileSize / 1048576)}MB`);
        return;
      }
      
      if (!allowedFileTypes.some(type => file.type.match(type.replace('*', '.*')))) {
        setError(`File ${file.name} is not an allowed type`);
        return;
      }
    }
    
    setSelectedFiles(files);
    setError(null);
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;
    
    setUploading(true);
    setUploadProgress(0);
    setError(null);

    try {
      const uploadResults = [];
      
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        
        // Get upload URL
        const params = await onGetUploadParameters();
        
        // Upload file
        const uploadResponse = await fetch(params.url, {
          method: params.method,
          body: file,
          headers: {
            'Content-Type': file.type,
          },
        });
        
        if (!uploadResponse.ok) {
          throw new Error(`Failed to upload ${file.name}`);
        }
        
        uploadResults.push({
          uploadURL: params.url,
          data: file,
        });
        
        // Update progress
        setUploadProgress(((i + 1) / selectedFiles.length) * 100);
      }
      
      // Call completion callback
      onComplete?.({ successful: uploadResults });
      
      // Close modal
      setShowModal(false);
      setSelectedFiles([]);
      setUploadProgress(0);
    } catch (err) {
      console.error('Upload error:', err);
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    if (!uploading) {
      setShowModal(false);
      setSelectedFiles([]);
      setUploadProgress(0);
      setError(null);
    }
  };

  return (
    <div>
      <Button 
        onClick={() => setShowModal(true)} 
        variant={buttonVariant}
        size={buttonSize}
        className={buttonClassName}
        disabled={disabled}
        data-testid="button-object-uploader"
      >
        {children}
      </Button>

      <Dialog open={showModal} onOpenChange={handleClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Files</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <Input
              type="file"
              accept={allowedFileTypes.join(',')}
              multiple={maxNumberOfFiles > 1}
              onChange={handleFileSelect}
              disabled={uploading}
            />
            
            <div className="text-xs text-muted-foreground">
              Max file size: {Math.round(maxFileSize / 1048576)}MB • Max files: {maxNumberOfFiles}
            </div>
            
            {selectedFiles.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Selected Files:</h4>
                {selectedFiles.map((file, index) => (
                  <div key={index} className="text-sm text-muted-foreground">
                    {file.name} ({Math.round(file.size / 1024)}KB)
                  </div>
                ))}
              </div>
            )}
            
            {uploading && (
              <div className="space-y-2">
                <div className="text-sm">Uploading... {Math.round(uploadProgress)}%</div>
                <Progress value={uploadProgress} />
              </div>
            )}
            
            {error && (
              <div className="text-sm text-destructive">
                {error}
              </div>
            )}
            
            <div className="flex justify-end gap-2">
              <Button 
                variant="outline" 
                onClick={handleClose}
                disabled={uploading}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleUpload}
                disabled={selectedFiles.length === 0 || uploading}
              >
                {uploading ? 'Uploading...' : 'Upload'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}