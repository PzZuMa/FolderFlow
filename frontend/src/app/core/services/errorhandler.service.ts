import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ErrorHandlerService {
  getErrorMessage(error: any): string {
    console.error('Error completo:', error);

    if (error.error instanceof ErrorEvent) {
      console.error('Error de red:', error.error.message);
      return 'No se pudo conectar con el servidor. Verifica tu conexión a internet.';
    }

    const statusCode = error.status || 0;
    const errorMessage = error.error?.message || error.error?.msg || error.message || 'Error desconocido';

    console.error(`Error ${statusCode}:`, errorMessage);

    switch (statusCode) {
      case 0:
        return 'No se pudo conectar con el servidor. Verifica tu conexión a internet.';
      case 400:
        return this.handleBadRequestError(errorMessage);
      case 401:
        return 'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.';
      case 403:
        return 'No tienes permisos para realizar esta acción.';
      case 404:
        return 'El recurso solicitado no se encontró.';
      case 409:
        return this.handleConflictError(errorMessage);
      case 413:
        return 'El archivo es demasiado grande. El tamaño máximo permitido es 10MB.';
      case 429:
        return 'Demasiadas solicitudes. Por favor, espera un momento antes de intentar nuevamente.';
      case 500:
        return 'Error interno del servidor. Nuestro equipo ha sido notificado.';
      case 503:
        return 'El servicio no está disponible temporalmente. Intenta nuevamente en unos minutos.';
      default:
        if (statusCode >= 500) {
          return 'Error del servidor. Nuestro equipo ha sido notificado.';
        } else if (statusCode >= 400) {
          return this.extractUserFriendlyMessage(errorMessage);
        }
        return 'Ocurrió un error inesperado. Por favor, intenta nuevamente.';
    }
  }

  private handleBadRequestError(errorMessage: string): string {
    const lowerMessage = errorMessage.toLowerCase();

    if (lowerMessage.includes('email') && lowerMessage.includes('already')) {
      return 'Esta dirección de email ya está registrada.';
    }

    if (lowerMessage.includes('password')) {
      return 'La contraseña no cumple con los requisitos de seguridad.';
    }

    if (lowerMessage.includes('file') && lowerMessage.includes('type')) {
      return 'Tipo de archivo no válido. Solo se permiten documentos, imágenes y archivos de texto.';
    }

    if (lowerMessage.includes('size')) {
      return 'El archivo es demasiado grande. El tamaño máximo permitido es 10MB.';
    }

    return this.extractUserFriendlyMessage(errorMessage);
  }

  private handleConflictError(errorMessage: string): string {
    const lowerMessage = errorMessage.toLowerCase();

    if (lowerMessage.includes('name') && lowerMessage.includes('already')) {
      return 'Ya existe un elemento con ese nombre. Por favor, elige otro nombre.';
    }

    return this.extractUserFriendlyMessage(errorMessage);
  }

  private extractUserFriendlyMessage(errorMessage: string): string {
    const safeMessages = [
      'el nombre es obligatorio',
      'el email es obligatorio',
      'formato de email inválido',
      'la contraseña debe tener al menos',
      'las contraseñas no coinciden',
      'el documento no fue encontrado',
      'la carpeta no fue encontrada',
      'no tienes permisos',
      'archivo demasiado grande',
      'tipo de archivo no válido'
    ];

    const lowerMessage = errorMessage.toLowerCase();
    const isSafeMessage = safeMessages.some(safe => lowerMessage.includes(safe));

    if (isSafeMessage) {
      return errorMessage;
    }

    return 'Ocurrió un error inesperado. Por favor, intenta nuevamente.';
  }

  getAuthErrorMessage(error: any): string {
    const baseMessage = this.getErrorMessage(error);

    if (error.status === 401) {
      return 'Email o contraseña incorrectos. Por favor, verifica tus credenciales.';
    }

    return baseMessage;
  }

  getFileErrorMessage(error: any): string {
    const baseMessage = this.getErrorMessage(error);

    if (error.status === 413) {
      return 'El archivo es demasiado grande. El tamaño máximo permitido es 10MB.';
    }

    if (error.status === 415) {
      return 'Tipo de archivo no válido. Solo se permiten documentos, imágenes y archivos de texto.';
    }

    return baseMessage;
  }
}