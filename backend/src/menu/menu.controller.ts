import {Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards} from '@nestjs/common';
import {MenuService} from './menu.service';
import {CreateCategoryDto, UpdateCategoryDto} from './dto/category.dto';
import {CreateMenuItemDto, ReorderDto, UpdateMenuItemDto} from './dto/menu-item.dto';
import {CreateTagDto} from './dto/tag.dto';
import {VenueScopeGuard} from '../common/venue-scope.guard';
import {Roles} from '../common/roles.decorator';
import {CurrentVenue} from '../common/current-user.decorator';
import {Public} from '../auth/public.decorator';
import {VenueRole} from '@prisma/client';

// All management routes require OWNER or MANAGER (section 3: staff/kitchen
// "cannot edit menu/tables"). Read is available to any member implicitly
// via VenueScopeGuard's membership check with no @Roles() on GET routes.
@Controller('venues/:venueId/menu')
@UseGuards(VenueScopeGuard)
@Roles(VenueRole.OWNER, VenueRole.MANAGER)
export class MenuController {
    constructor(private readonly menuService: MenuService) {
    }

    @Get('categories')
    listCategories(@CurrentVenue() scope: { venueId: string }) {
        return this.menuService.listCategories(scope.venueId);
    }

    @Post('categories')
    @Roles(VenueRole.OWNER, VenueRole.MANAGER)
    createCategory(@CurrentVenue() scope: { venueId: string }, @Body() dto: CreateCategoryDto) {
        return this.menuService.createCategory(scope.venueId, dto);
    }

    @Patch('categories/:categoryId')
    @Roles(VenueRole.OWNER, VenueRole.MANAGER)
    updateCategory(
        @CurrentVenue() scope: { venueId: string },
        @Param('categoryId') categoryId: string,
        @Body() dto: UpdateCategoryDto,
    ) {
        return this.menuService.updateCategory(scope.venueId, categoryId, dto);
    }

    @Delete('categories/:categoryId')
    @Roles(VenueRole.OWNER, VenueRole.MANAGER)
    deleteCategory(
        @CurrentVenue() scope: { venueId: string },
        @Param('categoryId') categoryId: string,
    ) {
        return this.menuService.deleteCategory(scope.venueId, categoryId);
    }

    @Post('categories/reorder')
    @Roles(VenueRole.OWNER, VenueRole.MANAGER)
    reorderCategories(@CurrentVenue() scope: { venueId: string }, @Body() dto: ReorderDto) {
        return this.menuService.reorderCategories(scope.venueId, dto);
    }

    @Post('items')
    @Roles(VenueRole.OWNER, VenueRole.MANAGER)
    createItem(@CurrentVenue() scope: { venueId: string }, @Body() dto: CreateMenuItemDto) {
        return this.menuService.createItem(scope.venueId, dto);
    }

    @Patch('items/:itemId')
    @Roles(VenueRole.OWNER, VenueRole.MANAGER)
    updateItem(
        @CurrentVenue() scope: { venueId: string },
        @Param('itemId') itemId: string,
        @Body() dto: UpdateMenuItemDto,
    ) {
        return this.menuService.updateItem(scope.venueId, itemId, dto);
    }

    // Deliberately allows STAFF too — "86ing" an item is a floor decision as
    // much as a manager one (a waiter finding out they're out of salmon
    // shouldn't need a manager to un-list it).
    @Patch('items/:itemId/availability')
    @Roles(VenueRole.OWNER, VenueRole.MANAGER, VenueRole.STAFF, VenueRole.KITCHEN, VenueRole.BAR)
    setAvailability(
        @CurrentVenue() scope: { venueId: string },
        @Param('itemId') itemId: string,
        @Body('isAvailable') isAvailable: boolean,
    ) {
        return this.menuService.setAvailability(scope.venueId, itemId, isAvailable);
    }

    @Delete('items/:itemId')
    @Roles(VenueRole.OWNER, VenueRole.MANAGER)
    deleteItem(@CurrentVenue() scope: { venueId: string }, @Param('itemId') itemId: string) {
        return this.menuService.deleteItem(scope.venueId, itemId);
    }

    @Post('items/reorder')
    @Roles(VenueRole.OWNER, VenueRole.MANAGER)
    reorderItems(@CurrentVenue() scope: { venueId: string }, @Body() dto: ReorderDto) {
        return this.menuService.reorderItems(scope.venueId, dto);
    }

    @Get('tags')
    listTags(@CurrentVenue() scope: { venueId: string }) {
        return this.menuService.listTags(scope.venueId);
    }

    @Post('tags')
    @Roles(VenueRole.OWNER, VenueRole.MANAGER)
    createTag(@CurrentVenue() scope: { venueId: string }, @Body() dto: CreateTagDto) {
        return this.menuService.createTag(scope.venueId, dto);
    }

    @Delete('tags/:tagId')
    @Roles(VenueRole.OWNER, VenueRole.MANAGER)
    deleteTag(@CurrentVenue() scope: { venueId: string }, @Param('tagId') tagId: string) {
        return this.menuService.deleteTag(scope.venueId, tagId);
    }
}

// Separate controller: no :venueId param, no VenueScopeGuard — this is the
// public customer-facing menu read, keyed by slug instead (section 7).
@Controller('public/menu')
export class PublicMenuController {
    constructor(private readonly menuService: MenuService) {
    }

    @Public()
    @Get(':venueSlug')
    getPublicMenu(@Param('venueSlug') venueSlug: string, @Query('lang') lang?: string) {
        return this.menuService.getPublicMenu(venueSlug, lang);
    }
}