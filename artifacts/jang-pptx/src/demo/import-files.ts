import type { ImportedImage } from '@/schema/lecture-types';

export const LECTURE_FILE_ACCEPT = '.json,application/json,text/json';
export const IMAGE_FILE_ACCEPT = '.png,.jpg,.jpeg,.gif,.svg,image/png,image/jpeg,image/gif,image/svg+xml';

const IMAGE_MIME_BY_EXTENSION: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
};

function extensionOf(fileName: string): string {
  const dotIndex = fileName.lastIndexOf('.');
  return dotIndex >= 0 ? fileName.slice(dotIndex).toLowerCase() : '';
}

export function parseLectureJsonText(text: string): unknown {
  const normalized = text.replace(/^\uFEFF/, '').trim();
  if (!normalized) {
    throw new Error('The selected JSON file is empty.');
  }

  try {
    return JSON.parse(normalized) as unknown;
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'Unknown JSON parsing error';
    throw new Error(`Invalid JSON file: ${detail}`);
  }
}

export async function readLectureJsonFile(file: File): Promise<{ text: string; data: unknown }> {
  if (file.size === 0) {
    throw new Error('The selected JSON file is empty.');
  }

  const text = (await file.text()).replace(/^\uFEFF/, '');
  return { text, data: parseLectureJsonText(text) };
}

export function getImageImportError(file: Pick<File, 'name' | 'type' | 'size'>): string | null {
  if (file.size === 0) {
    return 'The selected image file is empty.';
  }

  const extension = extensionOf(file.name);
  const expectedMime = IMAGE_MIME_BY_EXTENSION[extension];
  const normalizedMime = file.type.toLowerCase();

  if (!expectedMime) {
    return 'Unsupported image type. Choose a PNG, JPG, GIF, or SVG file.';
  }

  if (normalizedMime && normalizedMime !== expectedMime) {
    return `The file type (${normalizedMime}) does not match its ${extension} extension.`;
  }

  return null;
}

export function readImageFile(file: File): Promise<ImportedImage> {
  const validationError = getImageImportError(file);
  if (validationError) {
    return Promise.reject(new Error(validationError));
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => reject(new Error(`Could not read ${file.name}. Choose the file again.`));
    reader.onabort = () => reject(new Error(`Import of ${file.name} was cancelled.`));
    reader.onload = () => {
      if (typeof reader.result !== 'string' || !reader.result.startsWith('data:image/')) {
        reject(new Error(`Could not decode ${file.name} as an image.`));
        return;
      }

      resolve({
        dataUrl: reader.result,
        fileName: file.name,
        mimeType: file.type || IMAGE_MIME_BY_EXTENSION[extensionOf(file.name)],
      });
    };

    reader.readAsDataURL(file);
  });
}
