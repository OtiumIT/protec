-- Pack v1 Pablo/EPS: reexibe comparativo de regimes e ativa os 5 módulos
-- nos tenants já cadastrados por essas landings. Não remove módulos extras.

UPDATE public.modules
SET hidden = false
WHERE key = 'COMPARATIVO_REGIMES';

INSERT INTO public.tenant_modules (tenant_id, module_id, enabled_until)
SELECT c.id, m.id, NULL
FROM public.companies c
CROSS JOIN public.modules m
WHERE c.source IN ('PabloArruda', 'EPS')
  AND m.key IN (
    'GESTAO_IMOVEIS',
    'SIMULADOR_IN_2306',
    'IRPF_ALTA_RENDA',
    'MAPEAMENTO_DESPESAS_PJ',
    'COMPARATIVO_REGIMES'
  )
ON CONFLICT (tenant_id, module_id) DO NOTHING;
