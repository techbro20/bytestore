import { cookies } from 'next/headers';
import { createUploadthing, type FileRouter } from 'uploadthing/next';
import { UploadThingError } from 'uploadthing/server';
import { isValidAdminToken } from '@/lib/catalog-store';

const f = createUploadthing();

export const ourFileRouter = {
  productImage: f({
    image: {
      maxFileSize: '4MB',
      maxFileCount: 1,
    },
  })
    .middleware(async () => {
      const jar = await cookies();
      if (!isValidAdminToken(jar.get('bs_admin')?.value)) {
        throw new UploadThingError('Unauthorized');
      }
      return { admin: true as const };
    })
    .onUploadComplete(async ({ file }) => {
      return { url: file.ufsUrl };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
