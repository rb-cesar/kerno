// O protocolo MCP via stdio usa o stdout como canal JSON-RPC — qualquer
// console.log dos módulos do app (ex.: "▸ Event dispatcher inicializado")
// corromperia o stream. Este módulo precisa ser o PRIMEIRO import de server.ts:
// ESM avalia os imports em ordem, então o override vale antes do resto carregar.
console.log = console.error;
console.info = console.error;
console.debug = console.error;
