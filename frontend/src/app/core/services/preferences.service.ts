import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class UserPreferencesService {
  private readonly STORAGE_KEY_VIEW_TYPE = 'document_explorer_view_type';
  private readonly STORAGE_KEY_FAVORITES_FILTER = 'document_explorer_favorites_filter';

  constructor() {}

  saveViewType(viewType: 'grid' | 'list'): void {
    localStorage.setItem(this.STORAGE_KEY_VIEW_TYPE, viewType);
  }

  getViewType(): 'grid' | 'list' {
    return (localStorage.getItem(this.STORAGE_KEY_VIEW_TYPE) as 'grid' | 'list') || 'grid';
  }

  saveFavoritesFilter(showOnlyFavorites: boolean): void {
    localStorage.setItem(this.STORAGE_KEY_FAVORITES_FILTER, String(showOnlyFavorites));
  }

  getFavoritesFilter(): boolean {
    return localStorage.getItem(this.STORAGE_KEY_FAVORITES_FILTER) === 'true';
  }
}