import {
    BadRequestException,
    Controller,
    Post,
    UploadedFile,
    UseGuards,
    UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { StorageService } from './storage.service';
import { VenueScopeGuard } from '../common/venue-scope.guard';
import { Roles } from '../common/roles.decorator';
import { CurrentVenue } from '../common/current-user.decorator';
import { VenueRole } from '@prisma/client';

@Controller('venues/:venueId/uploads')
@UseGuards(VenueScopeGuard)
@Roles(VenueRole.OWNER, VenueRole.MANAGER)
export class StorageController {
    constructor(private readonly storageService: StorageService) {}

    @Post('image')
    @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }))
    async uploadImage(
        @CurrentVenue() scope: { venueId: string },
        @UploadedFile() file: Express.Multer.File,
    ) {
        if (!file) throw new BadRequestException('No file provided');
        const url = await this.storageService.uploadImage(scope.venueId, file);
        return { url };
    }
}