// Contratos compartilhados por ≥2 módulos — fonte única no core (evita cada
// módulo redefinir o mesmo formato).

/** Membro de um workspace, no formato leve usado por listas/menções. */
export interface MemberDTO {
  id: string;
  name: string;
}
