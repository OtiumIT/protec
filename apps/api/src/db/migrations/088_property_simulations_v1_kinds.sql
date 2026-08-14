-- Estende simulation_kind para ITBI, ITCMD e relatório do projeto (pack Pablo v1).

ALTER TABLE property_simulations
  DROP CONSTRAINT IF EXISTS check_property_simulations_simulation_kind;

ALTER TABLE property_simulations
  ADD CONSTRAINT check_property_simulations_simulation_kind
  CHECK (simulation_kind IN (
    'locacao_pf_pj',
    'ganho_capital_imovel',
    'itbi_integralizacao',
    'itcmd_doacao',
    'projeto_pps'
  ));

COMMENT ON COLUMN property_simulations.simulation_kind IS
  'locacao_pf_pj | ganho_capital_imovel | itbi_integralizacao | itcmd_doacao | projeto_pps';
