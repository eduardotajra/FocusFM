/**
 * Utilitário para recorte de imagens.
 * Usado com react-easy-crop: use croppedAreaPixels de onCropComplete.
 */

export interface PixelCrop {
  x: number
  y: number
  width: number
  height: number
}

function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.addEventListener('load', () => resolve(img))
    img.addEventListener('error', (e) => reject(e))
    img.setAttribute('crossOrigin', 'anonymous')
    img.src = url
  })
}

/**
 * Gera um Blob da imagem recortada a partir das coordenadas em pixels.
 * @param imageSrc - URL da imagem (object URL, data URL ou http(s))
 * @param pixelCrop - Área em pixels retornada por onCropComplete (croppedAreaPixels)
 * @param mimeType - Formato de saída ('image/jpeg' | 'image/png'). Padrão: 'image/jpeg'
 * @returns Blob pronto para upload (ex.: Supabase Storage)
 */
export async function getCroppedImg(
  imageSrc: string,
  pixelCrop: PixelCrop,
  mimeType: 'image/jpeg' | 'image/png' = 'image/jpeg'
): Promise<Blob> {
  const image = await createImage(imageSrc)
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')

  if (!ctx) {
    throw new Error('Canvas 2D não disponível')
  }

  canvas.width = pixelCrop.width
  canvas.height = pixelCrop.height

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  )

  return new Promise((resolve, reject) => {
    const quality = mimeType === 'image/jpeg' ? 0.92 : undefined
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Falha ao gerar a imagem recortada'))
          return
        }
        resolve(blob)
      },
      mimeType,
      quality
    )
  })
}
