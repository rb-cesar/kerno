// Cada arquivo de domain expõe uma classe (BoardDomain, CardDomain, ...) e uma
// instância pronta pra uso (board, card, ...) — mesmo padrão do service.ts.
// `import * as domain from "./domain"` + `domain.board.`/`domain.card.` dá
// autocomplete escopado por recurso, em vez de uma lista achatada de ~50 funções.
export { type BoardDomain, board, MAX_BOARDS } from "./board";
export { type CardDomain, card, MAX_CARDS_PER_BOARD } from "./card";
export { type CardDetailDomain, cardDetail } from "./card-detail";
export { type ChecklistDomain, checklist } from "./checklist";
export { type ColumnDomain, column } from "./column";
export { type CycleDomain, cycle } from "./cycle";
export { type LabelDomain, label } from "./label";
export { type MetricsDomain, metrics } from "./metrics";
export { type StoryDomain, story } from "./story";
