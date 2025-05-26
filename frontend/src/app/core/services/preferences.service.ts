import { Injectable } from '@angular/core';

/**
 * Servicio para gestionar las preferencias del usuario relacionadas con la vista del explorador de documentos.
 * Permite guardar y recuperar el tipo de vista (grid/list) y el filtro de favoritos usando localStorage.
 */
@Injectable({
  providedIn: 'root'
})
export class UserPreferencesService {
  // Clave para almacenar el tipo de vista en localStorage
  private readonly STORAGE_KEY_VIEW_TYPE = 'document_explorer_view_type';
  // Clave para almacenar el filtro de favoritos en localStorage
  private readonly STORAGE_KEY_FAVORITES_FILTER = 'document_explorer_favorites_filter';

  constructor() {}

  /**
   * Guarda el tipo de vista seleccionado por el usuario ('grid' o 'list').
   * @param viewType Tipo de vista a guardar.
   */
  saveViewType(viewType: 'grid' | 'list'): void {
    localStorage.setItem(this.STORAGE_KEY_VIEW_TYPE, viewType);
  }

  /**
   * Recupera el tipo de vista guardado. Por defecto retorna 'grid' si no hay valor almacenado.
   * @returns Tipo de vista ('grid' o 'list').
   */
  getViewType(): 'grid' | 'list' {
    return (localStorage.getItem(this.STORAGE_KEY_VIEW_TYPE) as 'grid' | 'list') || 'grid';
  }

  /**
   * Guarda el estado del filtro de favoritos (mostrar solo favoritos).
   * @param showOnlyFavorites Booleano que indica si se deben mostrar solo favoritos.
   */
  saveFavoritesFilter(showOnlyFavorites: boolean): void {
    localStorage.setItem(this.STORAGE_KEY_FAVORITES_FILTER, String(showOnlyFavorites));
  }

  /**
   * Recupera el estado del filtro de favoritos.
   * @returns true si está activado el filtro de favoritos, false en caso contrario.
   */
  getFavoritesFilter(): boolean {
    return localStorage.getItem(this.STORAGE_KEY_FAVORITES_FILTER) === 'true';
  }
}