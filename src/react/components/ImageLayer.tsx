import React, { useState, useEffect, useRef } from 'react'
import { Image as KonvaImage } from 'react-konva'

interface ImageLayerProps {
  src: string
  onLoad?: (width: number, height: number) => void
  onImageElement?: (img: HTMLImageElement) => void
}

function ImageLayer({ src, onLoad, onImageElement }: ImageLayerProps) {
  const [image, setImage] = useState<HTMLImageElement | null>(null)
  const prevSrc = useRef(src)

  useEffect(() => {
    const img = new window.Image();
    img.crossOrigin = 'anonymous'; 
    
    img.onload = () => {
      if (prevSrc.current === src) {
        setImage(img);
        onLoad?.(img.naturalWidth, img.naturalHeight);
      }
    };

    // 在 src 后面加个随机参数，强制浏览器重新发起带 CORS 头的请求
    const connector = src.includes('?') ? '&' : '?';
    img.src = `${src}${connector}t=${new Date().getTime()}`;
  }, [src]);

  if (!image) return null

  return <KonvaImage image={image} />
}

export { ImageLayer }
