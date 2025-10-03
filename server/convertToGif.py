#!/usr/bin/env python3
"""
MP4 to GIF converter using moviepy
Optimizes for reasonable file sizes while maintaining quality
"""

import sys
import os
from moviepy.editor import VideoFileClip

def convert_mp4_to_gif(input_path, output_path, max_duration=10, fps=10, width=500):
    """
    Convert MP4 video to optimized GIF
    
    Args:
        input_path: Path to input MP4 file
        output_path: Path to output GIF file
        max_duration: Maximum duration in seconds (default: 10)
        fps: Frames per second for GIF (default: 10)
        width: Maximum width in pixels (default: 500)
    """
    try:
        # Load the video
        clip = VideoFileClip(input_path)
        
        # Limit duration
        if clip.duration > max_duration:
            clip = clip.subclip(0, max_duration)
        
        # Calculate height maintaining aspect ratio
        aspect_ratio = clip.h / clip.w
        height = int(width * aspect_ratio)
        
        # Resize if needed
        if clip.w > width:
            clip = clip.resize(width=width)
        
        # Write GIF with optimized settings
        clip.write_gif(
            output_path,
            fps=fps,
            program='ffmpeg',
            opt='nq',  # No optimization (faster, slightly larger files)
            logger=None  # Suppress progress bars
        )
        
        # Clean up
        clip.close()
        
        print(f"SUCCESS: Converted {input_path} to {output_path}")
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
