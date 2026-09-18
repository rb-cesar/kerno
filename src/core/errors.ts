export class NotFound extends Error {
  constructor(message = "Não encontrado") {
    super(message);
    this.name = "NotFound";
  }
}

export class Forbidden extends Error {
  constructor(message = "Sem permissão") {
    super(message);
    this.name = "Forbidden";
  }
}

export class RuleViolation extends Error {
  constructor(message = "Violação de regra") {
    super(message);
    this.name = "RuleViolation";
  }
}
