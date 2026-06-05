// ================================================================
// NR18 SaaS — Checklist atualizado
// Portaria MTE nº 836, de 13 de maio de 2026
// ================================================================

export type NivelRisco = 'grave' | 'alto' | 'medio' | 'baixo'
export type GrauMulta = 'i1' | 'i2' | 'i3' | 'i4'

export interface ChecklistItem {
  id: string
  t: string
  ref: string
  nivel: NivelRisco
  perigo: string
  multa: GrauMulta
  nr: string
}

export interface ChecklistBloco {
  id: string
  titulo: string
  ref: string
  itens: ChecklistItem[]
}

export const MULTA_INFO = {
  i1: { label: 'I1', faixa: 'R$ 575 a R$ 2.781',  desc: 'Infracao grau I1 - menor gravidade' },
  i2: { label: 'I2', faixa: 'R$ 2.653 a R$ 4.387', desc: 'Infracao grau I2 - gravidade media' },
  i3: { label: 'I3', faixa: 'R$ 2.655 a R$ 4.387', desc: 'Infracao grau I3 - alta gravidade' },
  i4: { label: 'I4', faixa: 'R$ 4.387 a R$ 6.707', desc: 'Infracao grau I4 - gravidade maxima. Dobra em reincidencia (CLT art. 201).' },
}

export const CHECKLIST: ChecklistBloco[] = [
  {
    id: 'resp', titulo: '18.3 — Responsabilidades', ref: 'NR 18.3',
    itens: [
      { id:'re1', t:'Comunicacao Previa de Obras realizada no sistema informatizado SIT antes do inicio das atividades', ref:'18.3.1.b', nivel:'medio', perigo:'Gestao', multa:'i2', nr:'18.3.1 A organizacao da obra deve: b) fazer a Comunicacao Previa de Obras em sistema informatizado da Subsecretaria de Inspecao do Trabalho - SIT, antes do inicio das atividades, de acordo com a legislacao vigente.' },
      { id:'re2', t:'Vedado ingresso ou permanencia de trabalhadores sem resguardo das medidas previstas na NR-18', ref:'18.3.1.a', nivel:'grave', perigo:'Gestao', multa:'i4', nr:'18.3.1 A organizacao da obra deve: a) vedar o ingresso ou a permanencia de trabalhadores no canteiro de obras sem que estejam resguardados pelas medidas previstas nesta NR.' },
    ]
  },
  {
    id: 'pgr', titulo: '18.4 — PGR: Programa de Gerenciamento de Riscos', ref: 'NR 18.4',
    itens: [
      { id:'pgr1', t:'PGR elaborado e implementado contemplando todos os riscos ocupacionais e medidas de prevencao', ref:'18.4.1', nivel:'grave', perigo:'Gestao', multa:'i4', nr:'18.4.1 Sao obrigatorias a elaboracao e a implementacao do PGR nos canteiros de obras, contemplando os riscos ocupacionais e suas respectivas medidas de prevencao.' },
      { id:'pgr2', t:'PGR elaborado por profissional legalmente habilitado em SST (ou qualificado para obras de ate 7m e ate 10 trabalhadores)', ref:'18.4.2 / 18.4.2.1', nivel:'alto', perigo:'Gestao', multa:'i4', nr:'18.4.2 O PGR deve ser elaborado por profissional legalmente habilitado em seguranca do trabalho. 18.4.2.1 Em canteiros com ate 7m de altura e no maximo 10 trabalhadores, pode ser elaborado por profissional qualificado.' },
      { id:'pgr3', t:'PGR contem projeto da area de vivencia elaborado por profissional habilitado', ref:'18.4.3.a', nivel:'alto', perigo:'Gestao', multa:'i3', nr:'18.4.3 O PGR deve conter: a) projeto da area de vivencia do canteiro de obras e de eventual frente de trabalho, em conformidade com o item 18.5 desta NR, elaborado por profissional legalmente habilitado.' },
      { id:'pgr4', t:'PGR contem projeto eletrico das instalacoes temporarias elaborado por profissional habilitado', ref:'18.4.3.b', nivel:'grave', perigo:'Eletrico', multa:'i4', nr:'18.4.3 b) projeto eletrico das instalacoes temporarias, elaborado por profissional legalmente habilitado.' },
      { id:'pgr5', t:'PGR contem projetos dos Sistemas de Protecao Coletiva elaborados por profissional habilitado', ref:'18.4.3.c', nivel:'grave', perigo:'Queda', multa:'i4', nr:'18.4.3 c) projetos dos sistemas de protecao coletiva elaborados por profissional legalmente habilitado.' },
      { id:'pgr6', t:'PGR contem projetos do SPIQ (Sistema de Protecao Individual Contra Quedas), quando aplicavel', ref:'18.4.3.d', nivel:'grave', perigo:'Queda', multa:'i4', nr:'18.4.3 d) projetos dos Sistemas de Protecao Individual Contra Quedas (SPIQ), quando aplicavel, elaborados por profissional legalmente habilitado.' },
      { id:'pgr7', t:'PGR contem relacao de EPI com especificacoes tecnicas de acordo com os riscos ocupacionais', ref:'18.4.3.e', nivel:'medio', perigo:'Gestao', multa:'i2', nr:'18.4.3 e) relacao dos Equipamentos de Protecao Individual (EPI) e suas respectivas especificacoes tecnicas, de acordo com os riscos ocupacionais existentes.' },
      { id:'pgr8', t:'PGR atualizado de acordo com a etapa em que se encontra o canteiro de obras', ref:'18.4.3.1', nivel:'alto', perigo:'Gestao', multa:'i3', nr:'18.4.3.1 O PGR deve estar atualizado de acordo com a etapa em que se encontra o canteiro de obras.' },
      { id:'pgr9', t:'Empresas contratadas forneceram inventario de riscos de suas atividades para integracao ao PGR', ref:'18.4.4', nivel:'alto', perigo:'Gestao', multa:'i3', nr:'18.4.4 As empresas contratadas devem fornecer ao contratante o inventario de riscos ocupacionais especificos de suas atividades, o qual deve ser contemplado no PGR do canteiro de obras.' },
    ]
  },
  {
    id: 'vivencia', titulo: '18.5 — Areas de vivencia', ref: 'NR 18.5',
    itens: [
      { id:'viv1', t:'Area de vivencia com instalacao sanitaria, vestiario, local para refeicao e alojamento (quando houver pernoite)', ref:'18.5.1', nivel:'medio', perigo:'Saude', multa:'i2', nr:'18.5.1 As areas de vivencia devem ser projetadas de forma a oferecer condicoes minimas de seguranca, conforto e privacidade, contemplando: a) instalacao sanitaria; b) vestiario; c) local para refeicao; d) alojamento, quando houver trabalhador alojado.' },
      { id:'viv2', t:'Instalacao sanitaria: 1 conjunto (lavatorio + bacia + mictorio) por 20 trabalhadores; 1 chuveiro por 10 trabalhadores', ref:'18.5.3', nivel:'medio', perigo:'Saude', multa:'i2', nr:'18.5.3 A instalacao sanitaria deve ser constituida de lavatorio, bacia sanitaria sifonada dotada de assento com tampo, e mictorio, na proporcao de 1 conjunto para cada grupo de 20 trabalhadores ou fracao, bem como chuveiro na proporcao de 1 unidade para cada grupo de 10 trabalhadores ou fracao.' },
      { id:'viv3', t:'Deslocamento maximo de 150m do posto de trabalho ate a instalacao sanitaria mais proxima', ref:'18.5.5', nivel:'medio', perigo:'Saude', multa:'i2', nr:'18.5.5 Deve ser de no maximo 150m o deslocamento do trabalhador do seu posto de trabalho ate a instalacao sanitaria mais proxima.' },
      { id:'viv4', t:'Agua potavel, filtrada e fresca: 1 bebedouro por 25 trabalhadores; max 100m horizontal e 15m vertical; vedado copo coletivo', ref:'18.5.6 / 18.5.6.1', nivel:'alto', perigo:'Saude', multa:'i3', nr:'18.5.6 E obrigatorio o fornecimento de agua potavel, filtrada e fresca na proporcao de 1 unidade para cada grupo de 25 trabalhadores ou fracao, sendo vedado o uso de copos coletivos. 18.5.6.1 Do posto de trabalho ao bebedouro nao haja deslocamento superior a 100m no plano horizontal e 15m no plano vertical.' },
      { id:'viv5', t:'Frentes de trabalho com banheiro quimico (1 por 20 trab.) e local para refeicao com condicoes minimas de conforto e higiene', ref:'18.5.7', nivel:'medio', perigo:'Saude', multa:'i2', nr:'18.5.7 Nas frentes de trabalho devem ser disponibilizados: a) instalacao sanitaria para cada grupo de 20 trabalhadores ou fracao; b) local para refeicao dos trabalhadores, observadas as condicoes minimas de conforto e higiene, com protecao contra intemperies.' },
    ]
  },
  {
    id: 'eletrica', titulo: '18.6 — Instalacoes eletricas', ref: 'NR 18.6',
    itens: [
      { id:'ee1', t:'Instalacoes eletricas temporarias executadas e mantidas conforme projeto eletrico de profissional habilitado', ref:'18.6.2', nivel:'grave', perigo:'Eletrico', multa:'i4', nr:'18.6.2 As instalacoes eletricas temporarias devem ser executadas e mantidas conforme projeto eletrico elaborado por profissional legalmente habilitado.' },
      { id:'ee2', t:'Servicos em instalacoes eletricas realizados exclusivamente por trabalhadores autorizados conforme NR-10', ref:'18.6.3', nivel:'grave', perigo:'Eletrico', multa:'i4', nr:'18.6.3 Os servicos em instalacoes eletricas devem ser realizados por trabalhadores autorizados conforme NR-10.' },
      { id:'ee3', t:'Ausencia de partes vivas expostas e acessiveis por trabalhadores nao autorizados', ref:'18.6.4', nivel:'grave', perigo:'Eletrico', multa:'i4', nr:'18.6.4 E proibida a existencia de partes vivas expostas e acessiveis pelos trabalhadores nao autorizados em instalacoes e equipamentos eletricos.' },
      { id:'ee4', t:'Condutores sem obstruir circulacao, protegidos contra impactos e umidade, com isolacao correta e dupla para moveis/portateis', ref:'18.6.5', nivel:'grave', perigo:'Eletrico', multa:'i4', nr:'18.6.5 Os condutores eletricos devem: a) nao obstruir a circulacao; b) estar protegidos contra impactos mecanicos e umidade; c) possuir isolacao conforme normas tecnicas; d) possuir isolacao dupla ou reforcada para maquinas e equipamentos moveis ou portateis.' },
      { id:'ee5', t:'Sistema de aterramento eletrico e inspecoes/medicoes periodicas com laudos de profissional habilitado', ref:'18.6.7', nivel:'grave', perigo:'Eletrico', multa:'i4', nr:'18.6.7 As instalacoes eletricas devem possuir sistema de aterramento eletrico de protecao e devem ser submetidas a inspecoes e medicoes eletricas periodicas, com emissao dos respectivos laudos por profissional legalmente habilitado.' },
      { id:'ee6', t:'Dispositivo Diferencial Residual (DR) utilizado como medida de seguranca adicional nas situacoes previstas nas normas tecnicas', ref:'18.6.9', nivel:'grave', perigo:'Eletrico', multa:'i4', nr:'18.6.9 E obrigatoria a utilizacao do dispositivo Diferencial Residual (DR), como medida de seguranca adicional nas instalacoes eletricas, nas situacoes previstas nas normas tecnicas nacionais vigentes.' },
      { id:'ee7', t:'Quadros de distribuicao identificados, sinalizados quanto ao risco eletrico, com acesso desobstruido e partes vivas protegidas', ref:'18.6.10', nivel:'grave', perigo:'Eletrico', multa:'i4', nr:'18.6.10 Os quadros de distribuicao devem: c) ter as partes vivas inacessiveis e protegidas; d) ter acesso desobstruido; f) estar identificados e sinalizados quanto ao risco eletrico; h) ter seus circuitos identificados.' },
      { id:'ee8', t:'Canteiro protegido por SPDA (para-raios) conforme normas tecnicas, ou laudo de dispensa por profissional habilitado', ref:'18.6.18', nivel:'alto', perigo:'Eletrico', multa:'i3', nr:'18.6.18 Os canteiros de obras devem estar protegidos por Sistema de Protecao contra Descargas Atmosfericas - SPDA, projetado, construido e mantido conforme normas tecnicas nacionais vigentes. 18.6.18.1 Dispensado mediante laudo de profissional legalmente habilitado nas situacoes previstas em normas tecnicas.' },
      { id:'ee9', t:'Trabalho em proximidades de redes eletricas energizadas somente quando protegido contra choque e arco eletrico', ref:'18.6.19', nivel:'grave', perigo:'Eletrico', multa:'i4', nr:'18.6.19 O trabalho em proximidades de redes eletricas energizadas, internas ou externas ao canteiro de obras, so e permitido quando protegido contra o choque eletrico e arco eletrico.' },
    ]
  },
  {
    id: 'demolicao', titulo: '18.7.1 — Demolicao', ref: 'NR 18.7.1',
    itens: [
      { id:'dm1', t:'Plano de Demolicao elaborado e implementado por profissional habilitado contemplando todos os riscos e medidas de prevencao', ref:'18.7.1.1', nivel:'grave', perigo:'Colapso', multa:'i4', nr:'18.7.1.1 Deve ser elaborado e implementado Plano de Demolicao, sob responsabilidade de profissional legalmente habilitado, contemplando os riscos ocupacionais potencialmente existentes em todas as etapas da demolicao e as medidas de prevencao.' },
      { id:'dm2', t:'Plano de Demolicao considera: redes de energia, construcoes vizinhas, remocao de entulhos, aberturas no piso, areas de emergencia e controle de poeira', ref:'18.7.1.2', nivel:'alto', perigo:'Colapso', multa:'i3', nr:'18.7.1.2 O Plano de Demolicao deve considerar: a) linhas de fornecimento de energia, agua, inflamaveis, esgoto; b) construcoes vizinhas; c) remocao de materiais e entulhos; d) aberturas no piso; e) areas de circulacao de emergencia; g) propagacao e controle de poeira; h) transito de veiculos e pessoas.' },
    ]
  },
  {
    id: 'escavacao', titulo: '18.7.2 — Escavacao, fundacao e desmonte de rochas', ref: 'NR 18.7.2',
    itens: [
      { id:'esc1', t:'Escavacao, fundacao e desmonte realizados e supervisionados conforme projeto de profissional habilitado', ref:'18.7.2.1', nivel:'grave', perigo:'Soterramento', multa:'i4', nr:'18.7.2.1 O servico de escavacao, fundacao e desmonte de rochas deve ser realizado e supervisionado conforme projeto elaborado por profissional legalmente habilitado.' },
      { id:'esc2', t:'Areas com sinalizacao de advertencia (inclusive noturna) e barreira isolando todo o perimetro', ref:'18.7.2.2', nivel:'alto', perigo:'Soterramento', multa:'i3', nr:'18.7.2.2 Os locais devem ter sinalizacao de advertencia, inclusive noturna, e barreira de isolamento em todo o seu perimetro, de modo a impedir a entrada de veiculos e pessoas nao autorizadas.' },
      { id:'esc3', t:'Escavacao superior a 1,25m somente iniciada com liberacao e autorizacao de profissional habilitado', ref:'18.7.2.3', nivel:'grave', perigo:'Soterramento', multa:'i4', nr:'18.7.2.3 Toda escavacao com profundidade superior a 1,25m somente pode ser iniciada com a liberacao e autorizacao do profissional legalmente habilitado, atendendo as normas tecnicas nacionais vigentes.' },
      { id:'esc4', t:'Faixa de protecao minima de 1m nas bordas da escavacao, livre de cargas, com protecao contra aguas superficiais', ref:'18.7.2.7', nivel:'grave', perigo:'Soterramento', multa:'i4', nr:'18.7.2.7 Nas bordas da escavacao deve ser mantida faixa de protecao de no minimo 1m, livre de cargas, bem como manutencao de protecao para evitar a entrada de aguas superficiais na cava.' },
      { id:'esc5', t:'Escavacoes superiores a 1,25m com taludes ou escoramentos em projeto; escadas ou rampas proximas para saida rapida', ref:'18.7.2.8', nivel:'grave', perigo:'Soterramento', multa:'i4', nr:'18.7.2.8 As escavacoes com profundidade superior a 1,25m devem ser protegidas com taludes ou escoramentos definidos em projeto e devem dispor de escadas ou rampas proximas aos postos de trabalho para permitir saida rapida em emergencia.' },
      { id:'esc6', t:'Verificacao de cabos, tubulacoes de agua, esgoto, gas e outros antes e durante a escavacao', ref:'18.7.2.10', nivel:'grave', perigo:'Eletrico/Gas', multa:'i4', nr:'18.7.2.10 Quando existir na proximidade da escavacao cabos eletricos, tubulacoes de agua, esgoto, gas e outros, devem ser tomadas medidas preventivas de modo a eliminar o risco de acidentes durante a execucao da escavacao.' },
      { id:'esc7', t:'Escoramentos inspecionados diariamente', ref:'18.7.2.11', nivel:'grave', perigo:'Soterramento', multa:'i4', nr:'18.7.2.11 Os escoramentos utilizados como medida de prevencao devem ser inspecionados diariamente.' },
    ]
  },
  {
    id: 'carp', titulo: '18.7.3 / 18.7.4 — Carpintaria, armacao e estrutura de concreto', ref: 'NR 18.7.3 / 18.7.4',
    itens: [
      { id:'ca1', t:'Area de carpintaria com piso resistente e antiderrapante, cobertura, iluminacao protegida e limpeza diaria de residuos', ref:'18.7.3.1', nivel:'medio', perigo:'Acidente', multa:'i2', nr:'18.7.3.1 As areas de trabalho dos servicos de carpintaria devem: a) ter piso resistente, nivelado e antiderrapante; b) possuir cobertura capaz de proteger contra intemperies e queda de materiais; c) possuir lampadas protegidas contra impactos; d) ter residuos coletados e removidos diariamente.' },
      { id:'ca2', t:'Extremidades de vergalhoes que oferecem risco protegidas', ref:'18.7.3.6', nivel:'alto', perigo:'Perfuro-cortante', multa:'i3', nr:'18.7.3.6 As extremidades de vergalhoes que oferecem risco para os trabalhadores devem ser protegidas.' },
      { id:'ca3', t:'Projeto de formas e escoramentos com sequencia de retirada de escoras elaborado por profissional habilitado', ref:'18.7.4.1', nivel:'grave', perigo:'Colapso', multa:'i4', nr:'18.7.4.1 O projeto das formas e dos escoramentos, indicando a sequencia de retirada das escoras, deve ser elaborado por profissional legalmente habilitado.' },
      { id:'ca4', t:'Montagem e desforma com isolamento, sinalizacao e medidas que impedam queda livre de pecas', ref:'18.7.4.2', nivel:'grave', perigo:'Colapso', multa:'i4', nr:'18.7.4.2 Na montagem das formas e na desforma, sao obrigatorios o isolamento e a sinalizacao da area no entorno da atividade, alem de serem previstas medidas de prevencao para impedir a queda livre das pecas.' },
      { id:'ca5', t:'Concretagem supervisionada por trabalhador capacitado com inspecao de escoramento e formas antes e durante', ref:'18.7.4.3', nivel:'grave', perigo:'Colapso', multa:'i4', nr:'18.7.4.3 A operacao de concretagem deve ser supervisionada por trabalhador capacitado, devendo ser inspecionados os equipamentos, o escoramento e a resistencia das formas antes e durante a execucao.' },
    ]
  },
  {
    id: 'quente', titulo: '18.7.6 — Trabalho a quente', ref: 'NR 18.7.6',
    itens: [
      { id:'qt1', t:'Analise de risco elaborada para trabalhos a quente quando ha combustiveis no entorno ou fora de area destinada', ref:'18.7.6.2', nivel:'alto', perigo:'Incendio', multa:'i3', nr:'18.7.6.2 Deve ser elaborada analise de risco especifica para trabalhos a quente quando: a) houver materiais combustiveis ou inflamaveis no entorno; b) for realizado em area sem previo isolamento.' },
      { id:'qt2', t:'Trabalhador observador capacitado em combate a incendio presente durante trabalho a quente quando exigido pela analise de risco', ref:'18.7.6.3 / 18.7.6.4', nivel:'alto', perigo:'Incendio', multa:'i3', nr:'18.7.6.3 Quando definido na analise de risco, deve haver um trabalhador observador para exercer a vigilancia ate a conclusao do servico. 18.7.6.4 O trabalhador observador deve ser capacitado em prevencao e combate a incendio.' },
      { id:'qt3', t:'Ventilacao adequada para controle de fumos e contaminantes; superficie limpa antes dos trabalhos a quente', ref:'18.7.6.7', nivel:'alto', perigo:'Quimico', multa:'i3', nr:'18.7.6.7 Para o controle de fumos e contaminantes devem ser implementadas: a) limpeza adequada da superficie; b) renovacao de ar em ambientes fechados a fim de eliminar gases, vapores e fumos.' },
      { id:'qt4', t:'Cilindros de gas mantidos na vertical, fixados, afastados de chamas, calor e produtos inflamaveis', ref:'18.7.6.13', nivel:'grave', perigo:'Explosao', multa:'i4', nr:'18.7.6.13 Os cilindros de gas devem ser: a) mantidos em posicao vertical e devidamente fixados; b) afastados de chamas, fontes de centelhamento, calor e produtos inflamaveis; e) mantidos com valvulas fechadas quando inoperantes.' },
      { id:'qt5', t:'Proibicao de adaptadores entre cilindro e regulador; dispositivo contra retrocesso de chama no oxiacetileno', ref:'18.7.6.10 / 18.7.6.11', nivel:'grave', perigo:'Explosao', multa:'i4', nr:'18.7.6.10 E proibida a instalacao de adaptadores entre o cilindro e o regulador de pressao. 18.7.6.11 No caso de equipamento de oxiacetileno, deve ser utilizado dispositivo contra retrocesso de chama nas alimentacoes da mangueira e do macario.' },
      { id:'qt6', t:'Cilindros de gas proibidos em espacos confinados', ref:'18.7.6.16', nivel:'grave', perigo:'Explosao', multa:'i4', nr:'18.7.6.16 Sao proibidas a instalacao, a utilizacao e o armazenamento de cilindros de gases em ambientes confinados.' },
    ]
  },
  {
    id: 'impermeab', titulo: '18.7.7 / 18.7.8 — Impermeabilizacao e coberturas', ref: 'NR 18.7.7 / 18.7.8',
    itens: [
      { id:'im1', t:'Cilindros de gas instalados a minimo 3m do equipamento de aquecimento; mangueiras flexiveis de minimo 5m', ref:'18.7.7.5', nivel:'grave', perigo:'Explosao', multa:'i4', nr:'18.7.7.5 Os sistemas de aquecimento a gas devem atender: b) cilindros de gas instalados a no minimo 3m do equipamento de aquecimento; d) devem ser utilizados tubos ou mangueiras flexiveis de no minimo 5m.' },
      { id:'im2', t:'Trabalhadores de impermeabilizacao capacitados conforme Anexo I da NR-18 (4h inicial)', ref:'18.7.7.9 / Anexo I', nivel:'alto', perigo:'Queimadura', multa:'i3', nr:'18.7.7.9 Os trabalhadores envolvidos na atividade devem ser capacitados conforme definido no Anexo I desta NR. Carga horaria inicial: 4 horas.' },
      { id:'im3', t:'Trabalho em telhados e coberturas acima de 2m com risco de queda: NR-35 aplicada (SPIQ, APR, capacitacao)', ref:'18.7.8.1', nivel:'grave', perigo:'Queda', multa:'i4', nr:'18.7.8.1 No servico em telhados e coberturas que excedam 2m de altura com risco de queda de pessoas, aplica-se o disposto na NR-35.' },
      { id:'im4', t:'Proibido trabalhar em coberturas sobre superficies instaveis, escorregadias, sob chuva ou ventos fortes', ref:'18.7.8.2', nivel:'grave', perigo:'Queda', multa:'i4', nr:'18.7.8.2 E proibida a realizacao de trabalho em telhados ou coberturas: a) sobre superficies instaveis; b) sobre superficies escorregadias; c) sob chuva, ventos fortes ou condicoes climaticas adversas.' },
    ]
  },
  {
    id: 'escadas', titulo: '18.8 — Escadas, rampas e passarelas', ref: 'NR 18.8',
    itens: [
      { id:'es1', t:'Escada ou rampa instalada para transposicao de pisos com diferenca de nivel superior a 0,4m', ref:'18.8.1', nivel:'alto', perigo:'Queda', multa:'i3', nr:'18.8.1 E obrigatoria a instalacao de escada ou rampa para transposicao de pisos com diferenca de nivel superior a 0,4m como meio de circulacao de trabalhadores.' },
      { id:'es2', t:'Escadas coletivas fixas: largura min 0,8m; degraus max 0,2m; piso antiderrapante; patamar a cada 2,9m; sistema de protecao contra quedas', ref:'18.8.6.1', nivel:'alto', perigo:'Queda', multa:'i3', nr:'18.8.6.1 As escadas de uso coletivo devem: b) ser dotadas de sistema de protecao contra quedas; c) ter largura minima de 0,8m; d) ter altura uniforme entre os degraus de no maximo 0,2m; e) ter patamar intermediario no maximo a cada 2,9m; f) ter piso antiderrapante.' },
      { id:'es3', t:'Escada fixa vertical: espaçamento 0,25-0,3m; fixacao a cada 3m; SPIQ obrigatorio acima de 2m', ref:'18.8.6.2 / 18.8.6.3', nivel:'grave', perigo:'Queda', multa:'i4', nr:'18.8.6.2 A escada fixa vertical deve ter espaçamento uniforme dos degraus entre 0,25m e 0,3m e fixacao na base a cada 3m. 18.8.6.3 E obrigatoria a utilizacao de SPIQ em escadas tipo fixa vertical com altura superior a 2m.' },
      { id:'es4', t:'Escadas de mao: max 7m; ultrapassar 1m o piso superior; sapatas antiderrapantes; uso por uma pessoa por vez', ref:'18.8.6.13', nivel:'alto', perigo:'Queda', multa:'i3', nr:'18.8.6.13 As escadas de mao devem: a) possuir no maximo 7m de extensao; b) ultrapassar em pelo menos 1m o piso superior; c) possuir degraus fixados por meios que garantam rigidez. 18.8.6.10 As escadas portateis devem ser usadas por uma pessoa de cada vez.' },
      { id:'es5', t:'Rampas e passarelas: largura min 0,8m; piso antiderrapante; sistema de protecao contra quedas em todo o perimetro', ref:'18.8.7.1', nivel:'alto', perigo:'Queda', multa:'i3', nr:'18.8.7.1 As rampas e passarelas devem: b) possuir sistema de protecao contra quedas em todo o perimetro; c) ter largura minima de 0,8m; d) ter piso com forracao completa e antiderrapante; e) ser firmemente fixadas em suas extremidades.' },
    ]
  },
  {
    id: 'quedas', titulo: '18.9 — Protecao coletiva contra quedas', ref: 'NR 18.9',
    itens: [
      { id:'qd1', t:'Protecao coletiva onde ha risco de queda de trabalhadores ou projecao de materiais, projetada por profissional habilitado', ref:'18.9.1', nivel:'grave', perigo:'Queda', multa:'i4', nr:'18.9.1 E obrigatoria a instalacao de protecao coletiva onde houver risco de queda de trabalhadores ou de projecao de materiais e objetos no entorno da obra, projetada por profissional legalmente habilitado.' },
      { id:'qd1a', t:'[Portaria 836/2026] Perimetro da construcao de edificios com sistema de protecao contra quedas de materiais instalado em todo o perimetro', ref:'18.9.1.1', nivel:'grave', perigo:'Queda de material', multa:'i4', nr:'18.9.1.1 Em todo perimetro da construcao de edificios e obrigatoria a instalacao do sistema de protecao contra quedas de materiais, compativel com a carga, projetado por profissional habilitado e retirado somente quando os servicos acima estiverem concluidos. (Portaria MTE n 836, de 13/05/2026)' },
      { id:'qd2', t:'Guarda-corpo: travessao superior 1,2m (90 kgf/m) + intermediario 0,7m (66 kgf/m) + rodape 0,15m (22 kgf/m) + tela nos vaos', ref:'18.9.4.2', nivel:'grave', perigo:'Queda', multa:'i4', nr:'18.9.4.2 A protecao em sistema de guarda-corpo e rodape deve atender: a) travessao superior a 1,2m com resistencia a carga horizontal de 90 kgf/m; b) travessao intermediario a 0,7m com 66 kgf/m; c) rodape minimo de 0,15m com 22 kgf/m; d) vaos preenchidos com tela.' },
      { id:'qd3', t:'Aberturas no piso com fechamento provisorio resistente travado OU sistema de protecao contra quedas', ref:'18.9.2', nivel:'grave', perigo:'Queda', multa:'i4', nr:'18.9.2 As aberturas no piso devem: a) ter fechamento provisorio de material resistente travado ou fixado na estrutura; ou b) ser dotadas de sistema de protecao contra quedas.' },
      { id:'qd4', t:'Vaos de acesso as caixas dos elevadores com fechamento provisorio total, resistente e travado a estrutura', ref:'18.9.3', nivel:'grave', perigo:'Queda', multa:'i4', nr:'18.9.3 Os vaos de acesso as caixas dos elevadores devem ter fechamento provisorio de toda a abertura, de material resistente, travado ou fixado a estrutura, ate a colocacao definitiva das portas.' },
      { id:'qd5', t:'Plataformas de protecao projetadas por profissional habilitado, em bom estado de conservacao e sem sobrecarga', ref:'18.9.4.3', nivel:'grave', perigo:'Queda de material', multa:'i4', nr:'18.9.4.3 As plataformas de protecao devem ser projetadas por profissional legalmente habilitado, mantidas em adequado estado de conservacao e sem sobrecarga que prejudique a estabilidade.' },
      { id:'qd6', t:'Redes de seguranca conforme EN 1263-1 e EN 1263-2; inspecao semanal de todos os elementos e pontos de fixacao', ref:'18.9.4.4 / 18.9.4.4.5', nivel:'grave', perigo:'Queda', multa:'i4', nr:'18.9.4.4 As redes de seguranca devem ser confeccionadas e instaladas de acordo com as normas EN 1263-1 e EN 1263-2. 18.9.4.4.5 O sistema de redes deve ser submetido a inspecao semanal para verificacao das condicoes de todos os seus elementos e pontos de fixacao.' },
    ]
  },
  {
    id: 'maquinas', titulo: '18.10 — Maquinas, equipamentos e ferramentas', ref: 'NR 18.10',
    itens: [
      { id:'mq1', t:'Maquinas e equipamentos atendem ao disposto na NR-12', ref:'18.10.1.1', nivel:'grave', perigo:'Esmagamento', multa:'i4', nr:'18.10.1.1 As maquinas e os equipamentos devem atender ao disposto na NR-12 (Seguranca no Trabalho em Maquinas e Equipamentos).' },
      { id:'mq2', t:'Obras com altura igual ou superior a 10m com equipamento de transporte vertical motorizado de materiais instalado', ref:'18.10.1.4', nivel:'alto', perigo:'Queda de material', multa:'i3', nr:'18.10.1.4 Nas obras com altura igual ou superior a 10m, e obrigatoria a instalacao de maquina ou equipamento de transporte vertical motorizado de materiais.' },
      { id:'mq3', t:'Serra circular: estrutura metalica estavel, disco afiado, coifa, coletor de serragem, empurrador e guia de alinhamento', ref:'18.10.1.5', nivel:'grave', perigo:'Amputacao', multa:'i4', nr:'18.10.1.5 A serra circular deve: b) ser dotada de estrutura metalica estavel; c) ter o disco afiado e travado; f) ter coletor de serragem; g) ser dotada de dispositivo empurrador e guia de alinhamento; h) ter coifa ou dispositivo que impeca a projecao do disco.' },
      { id:'mq4', t:'Ferramentas eletricas portateis com duplo isolamento; condutores sem torcao, ruptura ou abrasao', ref:'18.10.2.4 / 18.10.2.7', nivel:'grave', perigo:'Eletrico', multa:'i4', nr:'18.10.2.7 E proibida a utilizacao de ferramenta eletrica portatil sem duplo isolamento. 18.10.2.4 O condutor de alimentacao da ferramenta eletrica deve ser manuseado de forma que nao sofra torcao, ruptura ou abrasao.' },
      { id:'mq5', t:'Ferramentas vistoriadas antes de cada utilizacao', ref:'18.10.2.3', nivel:'medio', perigo:'Acidente', multa:'i2', nr:'18.10.2.3 As ferramentas devem ser vistoriadas antes da sua utilizacao.' },
    ]
  },
  {
    id: 'guindar', titulo: '18.10 — Equipamentos de guindar (gruas, guindastes)', ref: 'NR 18.10.1.15-44',
    itens: [
      { id:'gn1', t:'Equipamentos de guindar utilizados conforme plano de carga de profissional habilitado contemplado no PGR', ref:'18.10.1.16', nivel:'grave', perigo:'Queda de carga', multa:'i4', nr:'18.10.1.16 Os equipamentos de guindar devem ser utilizados de acordo com as recomendacoes do fabricante e com o plano de carga, elaborado por profissional legalmente habilitado e contemplado no PGR.' },
      { id:'gn2', t:'Isolamento e sinalizacao da area sob carga suspensa mantidos durante operacao', ref:'18.10.1.21', nivel:'grave', perigo:'Queda de carga', multa:'i4', nr:'18.10.1.21 Devem ser mantidos o isolamento e a sinalizacao da area sob carga suspensa.' },
      { id:'gn3', t:'Inspecoes diarias registradas: pelo operador no equipamento e pelo sinaleiro nos dispositivos auxiliares', ref:'18.10.1.32', nivel:'alto', perigo:'Colapso', multa:'i3', nr:'18.10.1.32 Devem ser realizadas e registradas as inspecoes diarias das condicoes de seguranca: a) no equipamento, pelo seu operador; b) nos dispositivos auxiliares, pelo sinaleiro/amarrador de carga.' },
      { id:'gn4', t:'Grua com anemometro, limitador de momento, luz de obstaculo, alarme sonoro para ventos acima de 42 km/h', ref:'18.10.1.26 / 18.10.1.33', nivel:'grave', perigo:'Queda de carga', multa:'i4', nr:'18.10.1.26 Guindastes e gruas devem possuir: a) limitador de momento maximo; b) anemometro. 18.10.1.33 A grua deve dispor de: d) luz de obstaculo no ponto mais alto; j) dispositivo automatico com alarme sonoro que indique ventos superiores a 42 km/h.' },
      { id:'gn5', t:'Grua: proibida operacao acima de 72 km/h; entre 42-72 km/h exige analise de risco especifica e permissao de trabalho', ref:'18.10.1.34', nivel:'grave', perigo:'Queda de carga', multa:'i4', nr:'18.10.1.34 a) o trabalho com ventos acima de 42 km/h deve ser precedido de analise de risco especifica e autorizado mediante permissao de trabalho; b) sob nenhuma condicao e permitida a operacao com gruas com ventos superiores a 72 km/h.' },
      { id:'gn6', t:'Operador de grua capacitado: minimo 80h (40h pratica) + estagio supervisionado 90 dias (Anexo I)', ref:'Anexo I', nivel:'grave', perigo:'Acidente', multa:'i4', nr:'Anexo I NR-18: Operador de grua: treinamento inicial de 80 horas, sendo pelo menos 40 horas para a parte pratica, mais estagio supervisionado de pelo menos 90 dias.' },
      { id:'gn7', t:'Sinaleiro/amarrador de cargas capacitado: minimo 16h inicial + reciclagem a criterio do empregador/2 anos (Anexo I)', ref:'Anexo I', nivel:'alto', perigo:'Queda de carga', multa:'i3', nr:'Anexo I NR-18: Sinaleiro/amarrador de cargas: treinamento inicial de 16 horas; treinamento periodico a criterio do empregador, a cada 2 anos.' },
    ]
  },
  {
    id: 'elevadores', titulo: '18.11 — Elevadores e transporte vertical', ref: 'NR 18.11',
    itens: [
      { id:'el1', t:'Elevadores dimensionados por profissional habilitado conforme normas tecnicas nacionais vigentes', ref:'18.11.4', nivel:'grave', perigo:'Queda', multa:'i4', nr:'18.11.4 Os equipamentos de transporte vertical de materiais e de pessoas devem ser dimensionados por profissional legalmente habilitado e atender as normas tecnicas nacionais vigentes.' },
      { id:'el2', t:'Documentos no canteiro: manutencao preventiva, termo tecnico, laudo de freios (90 dias), vistorias diarias, laudo aterramento', ref:'18.11.7', nivel:'alto', perigo:'Queda', multa:'i3', nr:'18.11.7 Toda empresa usuaria deve possuir: a) programa de manutencao preventiva; b) termo de entrega tecnica; c) laudo de testes dos freios de emergencia a cada 90 dias; d) registro das vistorias diarias; h) laudo de aterramento elaborado por profissional habilitado.' },
      { id:'el3', t:'Cancela com intertravamento duplo canal e ruptura positiva em todos os acessos a torre do elevador', ref:'18.11.13.1', nivel:'grave', perigo:'Queda', multa:'i4', nr:'18.11.13.1 A barreira (cancela) deve ser dotada de dispositivo de intertravamento com duplo canal e ruptura positiva, monitorado por interface de seguranca, impedindo sua abertura quando o elevador nao estiver no nivel do pavimento.' },
      { id:'el4', t:'Proibido transportar pessoas com materiais salvo operador e responsavel, com barreira fisica de 1,8m e intertravamento', ref:'18.11.17', nivel:'grave', perigo:'Queda', multa:'i4', nr:'18.11.17 E proibido o transporte de pessoas juntamente com materiais, exceto operador e responsavel pelo material, desde que isolados por barreira fisica de altura minima de 1,8m com dispositivo de intertravamento com duplo canal e ruptura positiva.' },
      { id:'el5', t:'Obras com altura igual ou superior a 24m: elevador de passageiros obrigatorio, instalado a partir de 15m de deslocamento vertical', ref:'18.11.21 / 18.11.21.1', nivel:'grave', perigo:'Queda', multa:'i4', nr:'18.11.21 Na construcao com altura igual ou superior a 24m, e obrigatoria a instalacao de pelo menos um elevador de passageiros. 18.11.21.1 O elevador deve ser instalado no maximo a partir de 15m de deslocamento vertical na obra.' },
    ]
  },
  {
    id: 'andaimes', titulo: '18.12 — Andaimes e plataformas de trabalho', ref: 'NR 18.12',
    itens: [
      { id:'an1', t:'Andaimes projetados por profissional habilitado; fabricados por empresa inscrita no conselho de classe; manual em portugues', ref:'18.12.1', nivel:'grave', perigo:'Colapso', multa:'i4', nr:'18.12.1 Os andaimes devem: a) ser projetados por profissionais legalmente habilitados; b) ser fabricados por empresas regularmente inscritas no respectivo conselho de classe; c) ser acompanhados de manuais de instrucao em lingua portuguesa.' },
      { id:'an2', t:'Montagem de andaime conforme projeto de profissional habilitado (dispensado para torre unica com altura inferior a 4x a menor dimensao da base)', ref:'18.12.2', nivel:'grave', perigo:'Colapso', multa:'i4', nr:'18.12.2 A montagem de andaimes deve ser executada conforme projeto elaborado por profissional legalmente habilitado. 18.12.2.1 Dispensado para andaime simplesmente apoiado em torre unica com altura inferior a 4 vezes a menor dimensao da base.' },
      { id:'an3', t:'Registro formal de liberacao de uso assinado por profissional qualificado em SST ou responsavel pela obra', ref:'18.12.4', nivel:'alto', perigo:'Colapso', multa:'i3', nr:'18.12.4 Os andaimes devem possuir registro formal de liberacao de uso assinado por profissional qualificado em seguranca do trabalho ou pelo responsavel pela frente de trabalho ou da obra.' },
      { id:'an4', t:'Superficie de trabalho resistente, forracao completa, antiderrapante e com travamento anti-deslocamento', ref:'18.12.5', nivel:'grave', perigo:'Queda', multa:'i4', nr:'18.12.5 A superficie de trabalho do andaime deve ser resistente, ter forracao completa, ser antiderrapante, nivelada e possuir travamento que nao permita seu deslocamento ou desencaixe.' },
      { id:'an5', t:'Montagem e desmontagem por trabalhadores capacitados; com SPIQ; ferramentas com amarracao; area isolada e sinalizada', ref:'18.12.6', nivel:'grave', perigo:'Queda', multa:'i4', nr:'18.12.6 A atividade de montagem e desmontagem de andaimes deve ser realizada: a) por trabalhadores capacitados; b) com uso de SPIQ; c) com ferramentas com amarracao que impedam sua queda acidental; d) com isolamento e sinalizacao da area.' },
      { id:'an6', t:'Andaime em fachada externamente revestido por tela desde a 1a plataforma ate 2m acima da ultima', ref:'18.12.15', nivel:'alto', perigo:'Projecao', multa:'i3', nr:'18.12.15 O andaime simplesmente apoiado, quando montado nas fachadas das edificacoes, deve ser externamente revestido por tela de modo a impedir a projecao e queda de materiais. 18.12.15.1 O entelamento deve ser feito desde a primeira plataforma ate 2m acima da ultima.' },
      { id:'an6a', t:'[Portaria 836/2026] Andaimes multidirecionais com guarda-corpo: travessao superior 1,0-1,2m; intermediario 0,5m abaixo do superior; rodape 0,15m', ref:'18.12.15.2', nivel:'alto', perigo:'Queda', multa:'i3', nr:'18.12.15.2 Quando da utilizacao de andaimes multidirecionais, o sistema de protecao contra quedas deve dispor de travessao superior entre 1,0m e 1,20m de altura acima do estrado, travessao intermediario com distancia de 0,50m abaixo do travessao superior, e rodape com altura minima de 0,15m. (Portaria MTE n 836, de 13/05/2026)' },
      { id:'an7', t:'Andaime suspenso: minimo 4 pontos independentes; ponto SPIQ independente do andaime; verificacao diaria do sistema de suspensao', ref:'18.12.21 / 18.12.23', nivel:'grave', perigo:'Queda', multa:'i4', nr:'18.12.21 O andaime suspenso deve: c) possuir no minimo quatro pontos de sustentacao independentes; d) dispor de ponto de ancoragem do SPIQ independente do ponto de ancoragem do andaime. 18.12.23 O sistema de suspensao deve ser verificado diariamente.' },
      { id:'an8', t:'PEMT: inspecao visual e teste funcional antes de cada turno; operador capacitado; SPIQ conectado em ponto definido pelo fabricante', ref:'18.12.37 / 18.12.38 / 18.12.42', nivel:'grave', perigo:'Queda', multa:'i4', nr:'18.12.37 Cabe ao operador realizar a inspecao diaria do local onde sera utilizada a PEMT. 18.12.38 Antes do uso diario devem ser realizadas inspecao visual e teste funcional. 18.12.42 Todos os trabalhadores na PEMT devem utilizar SPIQ conectado em ponto de ancoragem definido pelo fabricante.' },
      { id:'an9', t:'Edificacoes com altura igual ou superior a 12m: dispositivos de ancoragem no projeto estrutural, suportando minimo 1.500 kgf', ref:'18.12.12', nivel:'alto', perigo:'Queda', multa:'i3', nr:'18.12.12 Nas edificacoes com altura igual ou superior a 12m devem ser instalados dispositivos destinados a ancoragem de equipamentos e de cabos de seguranca para uso de SPIQ. 18.12.12.2 Os dispositivos devem suportar carga de trabalho de minimo 1.500 kgf.' },
    ]
  },
  {
    id: 'sinalizacao', titulo: '18.13 — Sinalizacao de seguranca', ref: 'NR 18.13',
    itens: [
      { id:'si1', t:'Canteiro sinalizado: locais de apoio, saidas de emergencia, riscos, obrigatoriedade de EPI, isolamentos, circulacao de veiculos, substancias toxicas', ref:'18.13.1', nivel:'medio', perigo:'Acidente', multa:'i2', nr:'18.13.1 O canteiro de obras deve ser sinalizado com o objetivo de: a) identificar locais de apoio; b) indicar saidas de emergencia; c) advertir quanto aos riscos; d) alertar quanto a obrigatoriedade do uso de EPI; e) identificar isolamentos; f) identificar acessos e circulacao de veiculos; g) identificar locais com substancias toxicas, inflamaveis e explosivas.' },
      { id:'si2', t:'Vestimenta de alta visibilidade (colete ou similar) obrigatoria em areas de movimentacao de veiculos e cargas', ref:'18.13.2', nivel:'alto', perigo:'Atropelamento', multa:'i3', nr:'18.13.2 E obrigatorio o uso de vestimenta de alta visibilidade, coletes ou quaisquer outros meios, no torax e costas, quando o trabalhador estiver em servico em areas de movimentacao de veiculos e cargas.' },
    ]
  },
  {
    id: 'capacitacao', titulo: '18.14 — Capacitacao dos trabalhadores', ref: 'NR 18.14 / Anexo I',
    itens: [
      { id:'cap1', t:'Capacitacao basica: 4h inicial presencial + 4h a cada 2 anos; conteudo inclui condicoes de trabalho, riscos, EPC, EPI e PGR', ref:'18.14.3 / Anexo I', nivel:'alto', perigo:'Gestao', multa:'i3', nr:'18.14.3 O treinamento basico em seguranca do trabalho deve ser presencial. Anexo I: Capacitacao basica - 4 horas inicial + 4 horas/2 anos periodico. Conteudo: condicoes e meio ambiente de trabalho, riscos, EPC, EPI, PGR.' },
      { id:'cap2', t:'Treinamentos com avaliacao de conhecimento adquirido (exceto treinamento inicial)', ref:'18.14.5', nivel:'medio', perigo:'Gestao', multa:'i2', nr:'18.14.5 Os treinamentos devem possuir avaliacao de modo a aferir o conhecimento adquirido pelo trabalhador, exceto para o treinamento inicial.' },
      { id:'cap3', t:'Capacitacao de operadores compativel com a maquina ou equipamento especifico a ser utilizado', ref:'18.14.2', nivel:'alto', perigo:'Gestao', multa:'i3', nr:'18.14.2 A capacitacao, quando envolver a operacao de maquina ou equipamento, deve ser compativel com a maquina ou equipamento a ser utilizado.' },
      { id:'cap4', t:'Operador de elevador capacitado: 16h inicial + 4h anual (Anexo I)', ref:'Anexo I', nivel:'alto', perigo:'Queda', multa:'i3', nr:'Anexo I NR-18: Operador de elevador: treinamento inicial de 16 horas; treinamento periodico de 4 horas anual.' },
      { id:'cap5', t:'Trabalhadores de cadeira suspensa capacitados: 16h (8h pratica) inicial + 8h anual (Anexo I)', ref:'Anexo I', nivel:'grave', perigo:'Queda', multa:'i4', nr:'Anexo I NR-18: Utilizacao de cadeira suspensa: treinamento inicial de 16 horas, sendo pelo menos 8 horas para a parte pratica; treinamento periodico de 8 horas anual.' },
    ]
  },
  {
    id: 'gerais', titulo: '18.16 — Disposicoes gerais', ref: 'NR 18.16',
    itens: [
      { id:'ger1', t:'Hierarquia de prevencao da NR-01 adotada nas medidas de controle de riscos', ref:'18.16.1', nivel:'alto', perigo:'Gestao', multa:'i3', nr:'18.16.1 Nas atividades da industria da construcao, a adocao das medidas de prevencao deve seguir a hierarquia prevista na NR-01.' },
      { id:'ger2', t:'Materiais armazenados sem causar acidentes, sem obstruir circulacao, extintores, portas ou saidas de emergencia', ref:'18.16.4', nivel:'medio', perigo:'Incendio', multa:'i2', nr:'18.16.4 Os materiais devem ser armazenados de modo a nao ocasionar acidentes, prejudicar o transito de pessoas, a circulacao de materiais, o acesso aos equipamentos de combate a incendio e nao obstruir portas ou saidas de emergencia.' },
      { id:'ger3', t:'Locais de armazenamento de toxicos, inflamaveis ou explosivos: isolados, sinalizados, acesso restrito e com FISPQ', ref:'18.16.5', nivel:'grave', perigo:'Incendio', multa:'i4', nr:'18.16.5 Os locais destinados ao armazenamento de materiais toxicos, corrosivos, inflamaveis ou explosivos devem: a) ser isolados, apropriados e sinalizados; b) ter acesso permitido somente a pessoas devidamente autorizadas; c) dispor de FISPQ.' },
      { id:'ger4', t:'Canteiro com medidas de prevencao de incendios conforme legislacao estadual e normas tecnicas vigentes', ref:'18.16.9', nivel:'alto', perigo:'Incendio', multa:'i3', nr:'18.16.9 O canteiro de obras deve ser dotado de medidas de prevencao de incendios, em conformidade com a legislacao estadual e as normas tecnicas nacionais vigentes.' },
      { id:'ger5', t:'Saidas de emergencia em numero suficiente, sinalizadas e nunca fechadas a chave durante a jornada de trabalho', ref:'18.16.10 / 18.16.12', nivel:'alto', perigo:'Incendio', multa:'i3', nr:'18.16.10 Os locais de trabalho devem dispor de saidas em numero suficiente para abandono rapido e seguro em caso de emergencia. 18.16.12 Nenhuma saida de emergencia deve ser fechada a chave ou trancada durante a jornada de trabalho.' },
      { id:'ger6', t:'Canteiro organizado, limpo e desimpedido nas vias de circulacao, passagens e escadarias', ref:'18.16.15', nivel:'medio', perigo:'Queda', multa:'i2', nr:'18.16.15 O canteiro de obras deve apresentar-se organizado, limpo e desimpedido, notadamente nas vias de circulacao, passagens e escadarias.' },
      { id:'ger7', t:'Tapume de altura minima de 2m instalado em toda atividade para impedir acesso de pessoas estranhas', ref:'18.16.18', nivel:'medio', perigo:'Acidente', multa:'i2', nr:'18.16.18 E obrigatoria a colocacao de tapume com altura minima de 2m sempre que se executarem atividades da industria da construcao, de forma a impedir o acesso de pessoas estranhas aos servicos.' },
      { id:'ger8', t:'Em acidente fatal: comunicacao imediata por escrito ao orgao regional; local isolado ate liberacao pelo orgao competente (max 72h)', ref:'18.16.23', nivel:'grave', perigo:'Gestao', multa:'i4', nr:'18.16.23 Em caso de acidente fatal: a) comunicar de imediato e por escrito ao orgao regional competente em SST; b) isolar o local relacionado ao acidente, mantendo suas caracteristicas ate liberacao pela autoridade policial e pelo orgao regional competente. A liberacao sera concedida em ate 72 horas.' },
      { id:'ger9', t:'Obras com mais de 2 pavimentos no alinhamento do logradouro: galeria sobre o passeio ou outra medida de protecao projetada por profissional habilitado', ref:'18.16.19', nivel:'alto', perigo:'Queda de material', multa:'i3', nr:'18.16.19 Nas atividades com mais de 2 pavimentos a partir do nivel do meio-fio, executadas no alinhamento do logradouro, deve ser construida galeria sobre o passeio ou outra medida de protecao, de acordo com projeto de profissional legalmente habilitado.' },
    ]
  },
]
