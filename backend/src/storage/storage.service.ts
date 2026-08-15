import {Injectable} from '@nestjs/common';
import {ConfigService} from '@nestjs/config';
import {createClient, SupabaseClient} from '@supabase/supabase-js';

@Injectable()
export class StorageService {
    private readonly client: SupabaseClient;
    private readonly bucket: string;

    constructor(private readonly config: ConfigService) {
        // service_role key — server-side only, never sent to the frontend
        // (section 11: photo uploads go through Supabase Storage, not
        // base64-in-database, but still through NestJS as the single gatekeeper
        // rather than the browser uploading directly with its own credentials).
        this.client = createClient(
            config.getOrThrow('SUPABASE_URL'),
            config.getOrThrow('SUPABASE_SERVICE_ROLE_KEY'),
        );
        this.bucket = config.get('SUPABASE_STORAGE_BUCKET') ?? 'menu-photos';
    }

    /** Reasonable size/type limits (section 11) enforced here, before any
     * upload touches Storage. */
    private assertValidImage(file: Express.Multer.File) {
        const MAX_BYTES = 5 * 1024 * 1024; // 5MB
        const ALLOWED = ['image/jpeg', 'image/png', 'image/webp'];
        if (!ALLOWED.includes(file.mimetype)) {
            throw new Error(`Unsupported image type: ${file.mimetype}`);
        }
        if (file.size > MAX_BYTES) {
            throw new Error('Image too large (max 5MB).');
        }
    }

    async uploadImage(venueId: string, file: Express.Multer.File): Promise<string> {
        this.assertValidImage(file);

        const ext = file.originalname.split('.').pop() ?? 'jpg';
        // Path-namespaced by venueId — not a tenant-isolation control on its own
        // (Storage isn't queried per-tenant the way Postgres rows are), just
        // keeps uploads organized and collision-free.
        const path = `${venueId}/${crypto.randomUUID()}.${ext}`;

        const {error} = await this.client.storage
            .from(this.bucket)
            .upload(path, file.buffer, {contentType: file.mimetype, upsert: false});

        if (error) throw new Error(`Upload failed: ${error.message}`);

        const {data} = this.client.storage.from(this.bucket).getPublicUrl(path);
        return data.publicUrl;
    }


}