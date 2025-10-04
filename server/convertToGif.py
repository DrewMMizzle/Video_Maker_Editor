#!/usr/bin/env python3
"""
MP4 to GIF converter using imageio and Pillow
Optimizes for reasonable file sizes while maintaining quality
"""

import sys
import os
import imageio.v3 as iio
from PIL import Image

def convert_mp4_to_gif(input_path, output_path, max_duration=10, target_fps=10, max_width=500):
    """
    Convert MP4 video to optimized GIF
    
    Args:
        input_path: Path to input MP4 file
        output_path: Path to output GIF file
        max_duration: Maximum duration in seconds (default: 10)
        target_fps: Target frames per second for GIF (default: 10)
        max_width: Maximum width in pixels (default: 500)
    """
    try:
        # Read video metadata (using default ffmpeg backend)
        video_metadata = iio.immeta(input_path)
        source_fps = video_metadata.get('fps', 30)
        
        # Calculate frame skip to achieve target fps
        frame_skip = max(1, int(source_fps / target_fps))
        
        # Read frames from video (using default ffmpeg backend)
        frames = []
        frame_count = 0
        # 999 is a sentinel value for "full video length"
        max_frames = None if max_duration >= 999 else int(max_duration * target_fps)
        
        for frame in iio.imiter(input_path):
            if frame_count % frame_skip == 0:
                # Convert numpy array to PIL Image
                pil_frame = Image.fromarray(frame)
                
                # Resize if width exceeds maximum
                if pil_frame.width > max_width:
                    aspect_ratio = pil_frame.height / pil_frame.width
                    new_height = int(max_width * aspect_ratio)
                    pil_frame = pil_frame.resize((max_width, new_height), Image.Resampling.LANCZOS)
                
                frames.append(pil_frame)
                
                # Stop if we've reached max duration (only if max_frames is set)
                if max_frames is not None and len(frames) >= max_frames:
                    break
            
            frame_count += 1
        
        if not frames:
            raise ValueError("No frames extracted from video")
        
        # Save as GIF
        frames[0].save(
            output_path,
            save_all=True,
            append_images=frames[1:],
            duration=int(1000 / target_fps),  # Duration in milliseconds per frame
            loop=0,  # Loop forever
            optimize=False  # Skip optimization for faster processing
        )
        
        print(f"SUCCESS: Converted {input_path} to {output_path} ({len(frames)} frames)")
        return True
        
    except Exception as e:
        print(f"ERROR: {str(e)}", file=sys.stderr)
        return False

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python convertToGif.py <input.mp4> <output.gif> [max_duration] [fps] [width]")
        sys.exit(1)
    
    input_path = sys.argv[1]
    output_path = sys.argv[2]
    max_duration = int(sys.argv[3]) if len(sys.argv) > 3 else 10
    fps = int(sys.argv[4]) if len(sys.argv) > 4 else 10
    width = int(sys.argv[5]) if len(sys.argv) > 5 else 500
    
    if not os.path.exists(input_path):
        print(f"ERROR: Input file not found: {input_path}", file=sys.stderr)
        sys.exit(1)
    
    success = convert_mp4_to_gif(input_path, output_path, max_duration, fps, width)
    sys.exit(0 if success else 1)
