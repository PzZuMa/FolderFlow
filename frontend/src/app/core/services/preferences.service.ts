import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class UserPreferencesService {
  private readonly STORAGE_KEY_VIEW_TYPE = 'document_explorer_view_type';
  private readonly STORAGE_KEY_FAVORITES_FILTER = 'document_explorer_favorites_filter';

  constructor() {}

  // Guardar tipo de vista (grid o list)
  saveViewType(viewType: 'grid' | 'list'): void {
    localStorage.setItem(this.STORAGE_KEY_VIEW_TYPE, viewType);
  }

  // Obtener tipo de vista guardado previamente, o grid si no existe
  getViewType(): 'grid' | 'list' {
    return (localStorage.getItem(this.STORAGE_KEY_VIEW_TYPE) as 'grid' | 'list') || 'grid';
  }

  // Guardar estado del filtro de favoritos
  saveFavoritesFilter(showOnlyFavorites: boolean): void {
    localStorage.setItem(this.STORAGE_KEY_FAVORITES_FILTER, String(showOnlyFavorites));
  }

  // Obtener estado del filtro de favoritos guardado previamente, o false si no existe
  getFavoritesFilter(): boolean {
    return localStorage.getItem(this.STORAGE_KEY_FAVORITES_FILTER) === 'true';
  }
}