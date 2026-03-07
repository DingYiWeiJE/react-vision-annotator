import React, { useState, useEffect, useRef } from 'react'
import { Image as KonvaImage } from 'react-konva'

interface ImageLayerProps {
  src: string
  onLoad?: (width: number, height: number) => void
}

function ImageLayer({ src, onLoad }: ImageLayerProps) {
  const [image, setImage] = useState<HTMLImageElement | null>(null)
  const prevSrc = useRef(src)

  useEffect(() => {
    prevSrc.current = src
    const img = new window.Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      // 仅当 src 未在加载期间更改时才更新
      if (prevSrc.current === src) {
        setImage(img)
        onLoad?.(img.naturalWidth, img.naturalHeight)
      }
    }
    img.src = src
  }, [src])

  if (!image) return null

  return <KonvaImage image={image} />
}

export { ImageLayer }
