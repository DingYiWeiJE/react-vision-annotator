import React, { useState, useEffect, useRef } from 'react'
import { Image as KonvaImage } from 'react-konva'

interface ImageLayerProps {
  src: string
  onLoad?: (width: number, height: number) => void
  onImageElement?: (img: HTMLImageElement | null) => void
}

function ImageLayer({ src, onLoad, onImageElement }: ImageLayerProps) {
  const [image, setImage] = useState<HTMLImageElement | null>(null)
  const prevSrc = useRef(src)

  useEffect(() => {
    prevSrc.current = src
    setImage(null)
    onImageElement?.(null)

    const img = new window.Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      // 仅当 src 未在加载期间更改时才更新
      if (prevSrc.current === src) {
        setImage(img)
        onLoad?.(img.naturalWidth, img.naturalHeight)
        onImageElement?.(img)
      }
    }
    img.onerror = () => {
      if (prevSrc.current === src) {
        setImage(null)
        onImageElement?.(null)
      }
    }
    img.src = src
  }, [src])

  if (!image) return null

  return <KonvaImage image={image} />
}

export { ImageLayer }
