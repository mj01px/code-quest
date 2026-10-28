## 1. Identificação
- **Aluno(s):** Arthur Sabino da Silva - RGM [11231101730] / Julio Franz Moura - RGM [11231102166] / Mauro Aparecido Goncalves de Campos Junior - RGM [11231100402]
- **Projeto (PFC):** CodeQuest
- **Branch:** feat/testes-integracao

## 2. Resumo da entrega
Testes de integração para os controllers de Trilhas (leitura pública) e Autoria (criação, leitura editorial e exclusão de conteúdo). Os testes percorrem o fluxo HTTP completo (request, autenticação JWT, permissão, view, serializer, service, banco) com pytest + `APIClient`, e cobrem caminho feliz, validação, 404, persistência, relacionamento Trilha com Aula e segurança (401, 403 e 2xx).

## 3. Configuração do ambiente de teste
- **Estratégia:** pytest-django + `APIClient` do DRF (equivalente ao MockMvc/RestClient), com autenticação por `Authorization: Bearer <JWT>` gerado por `RefreshToken.for_user`
- **Banco de teste:** SQLite em memória, ativado por `DATABASE_URL=sqlite:///:memory:` (o padrão do projeto é PostgreSQL via `.env`)
- **Arquivo de configuração:** `backend/pyproject.toml`, seção `[tool.pytest.ini_options]` (existente, não alterada)
- **Isolamento de dados:** `uuid.uuid4()` no nickname dos usuários e no nome/slug das trilhas e aulas; cada teste roda em transação revertida (`pytest.mark.django_db`) e o `conftest.py` limpa o cache de throttle
- **Componentes mockados e motivo:** nenhum. View, serializer, service, auditoria e banco são reais. O Judge0 não é acionado por nenhuma destas rotas.

## 4. Matriz de endpoints cobertos
| # | Método | Rota | Controller | Caminho feliz (status) | Erro(s) (status) | Efeito verificado |
|---|---|---|---|---|---|---|
| 1 | POST | /api/v1/autoria/trilhas/ | CriarTrilhaView | 201 | 400, 403 | Trilha existe no banco, com autor e status RASCUNHO |
| 2 | GET | /api/v1/trilhas/ | TrilhaListView | 200 | - | Só trilhas publicadas aparecem |
| 3 | GET | /api/v1/trilhas/{slug}/ | TrilhaDetailView | - | 404 | Slug inexistente devolve erro padronizado |
| 4 | GET | /api/v1/autoria/{trilhas,aulas}/{id}/detalhe/ | DetalheEditorialView | 200 | 404 | Trilha traz as aulas; aula traz os flashcards |
| 5 | DELETE | /api/v1/autoria/trilhas/{id}/ | RascunhoView | 204 | - | Trilha removida do banco e GET seguinte dá 404 |
| 6 | POST | /api/v1/autoria/aulas/ | CriarAulaView | 201 | - | Aula vinculada à trilha |
| 7 | GET | /api/v1/autoria/rascunhos/ | RascunhosView | 200 | 401, 403 | Lista contém o rascunho criado pelo autor |
| 8 | POST | /api/v1/autoria/flashcards/ | CriarFlashcardView | 201 | - | Flashcard salvo e vinculado à aula |

**Total de endpoints cobertos:** 8

## 5. Cenários de integração implementados
| # | Endpoint | Cenário | Tipo | Status | Verificado além do status | Arquivo de teste | Método de teste |
|---|---|---|---|---|---|---|---|
| 1 | POST /autoria/trilhas/ | Dados válidos | Feliz | 201 | id, nome, slug e dificuldade no corpo | test_integracao_aula11.py | test_criar_trilha_com_dados_validos_deve_retornar_201 |
| 2 | GET /trilhas/ | Listar trilhas | Feliz | 200 | campos do item; rascunho fora da lista | test_integracao_aula11.py | test_listar_trilhas_deve_retornar_200 |
| 3 | POST /autoria/trilhas/ | Sem nome | Erro | 400 | código `validacao` e campo `nome` nos detalhes; nada gravado | test_integracao_aula11.py | test_criar_trilha_sem_nome_deve_retornar_400 |
| 4 | GET /autoria/trilhas/{id}/detalhe/ e GET /trilhas/{slug}/ | Id e slug inexistentes | Erro | 404 | código `not_found` | test_integracao_aula11.py | test_buscar_trilha_inexistente_deve_retornar_404 |
| 5 | POST /autoria/trilhas/ | Aluno sem permissão de autor | Erro | 403 | código `permission_denied`; nada gravado | test_integracao_aula11.py | test_criar_trilha_sem_permissao_de_autor_deve_retornar_403 |
| 6 | POST /autoria/trilhas/ | Efeito no banco | Persistência | 201 | `Trilha.objects.get`: nome, autor, RASCUNHO; GET de detalhe devolve o nome | test_integracao_aula11.py | test_criar_trilha_deve_persistir_no_banco |
| 7 | DELETE /autoria/trilhas/{id}/ | Efeito no banco | Persistência | 204 | `exists()` falso; GET de detalhe dá 404 | test_integracao_aula11.py | test_deletar_trilha_deve_remover_do_banco |
| 8 | POST /autoria/aulas/ | Aula dentro da trilha | Relacionamento | 201 | GET de detalhe da trilha lista a aula; FK no banco | test_integracao_aula11.py | test_criar_aula_e_verificar_na_trilha |
| 9 | GET /autoria/rascunhos/ | Sem token | Segurança | 401 | código `not_authenticated` | test_integracao_aula11.py | test_acessar_rascunhos_sem_token_deve_retornar_401 |
| 10 | GET /autoria/rascunhos/ | Aluno sem permissão | Segurança | 403 | código `permission_denied` | test_integracao_aula11.py | test_acessar_rascunhos_sem_permissao_deve_retornar_403 |
| 11 | GET /autoria/rascunhos/ | Autor com permissão | Segurança | 200 | item do rascunho criado aparece com tipo, título e status | test_integracao_aula11.py | test_acessar_rascunhos_com_permissao_deve_retornar_200 |
| 12 | POST /autoria/flashcards/ | Flashcard em aula própria | Feliz | 201 | banco e detalhe da aula listam o card | test_integracao_aula11.py | test_criar_flashcard_deve_retornar_201 |

Tipo: Feliz | Erro | Segurança | Persistência | Relacionamento
**Total de cenários de integração:** 12

## 6. Arquivos criados ou alterados
| Arquivo (caminho completo) | Criado / Alterado | Qtd. de testes |
|---|---|---|
| backend/apps/autoria/tests/test_integracao_aula11.py | Criado | 12 |

**Total de arquivos de teste:** 1   |   **Total de testes de integração:** 12

## 7. Como executar os testes
```
cd backend
$env:DATABASE_URL = "sqlite:///:memory:"
.venv\Scripts\python.exe -m pytest apps/autoria/tests/test_integracao_aula11.py -v
```

## 8. Evidências
- **Resultado da execução:**
```
apps/autoria/tests/test_integracao_aula11.py::test_criar_trilha_com_dados_validos_deve_retornar_201 PASSED [  8%]
apps/autoria/tests/test_integracao_aula11.py::test_listar_trilhas_deve_retornar_200 PASSED [ 16%]
apps/autoria/tests/test_integracao_aula11.py::test_criar_trilha_sem_nome_deve_retornar_400 PASSED [ 25%]
apps/autoria/tests/test_integracao_aula11.py::test_buscar_trilha_inexistente_deve_retornar_404 PASSED [ 33%]
apps/autoria/tests/test_integracao_aula11.py::test_criar_trilha_sem_permissao_de_autor_deve_retornar_403 PASSED [ 41%]
apps/autoria/tests/test_integracao_aula11.py::test_criar_trilha_deve_persistir_no_banco PASSED [ 50%]
apps/autoria/tests/test_integracao_aula11.py::test_deletar_trilha_deve_remover_do_banco PASSED [ 58%]
apps/autoria/tests/test_integracao_aula11.py::test_criar_aula_e_verificar_na_trilha PASSED [ 66%]
apps/autoria/tests/test_integracao_aula11.py::test_acessar_rascunhos_sem_token_deve_retornar_401 PASSED [ 75%]
apps/autoria/tests/test_integracao_aula11.py::test_acessar_rascunhos_sem_permissao_deve_retornar_403 PASSED [ 83%]
apps/autoria/tests/test_integracao_aula11.py::test_acessar_rascunhos_com_permissao_deve_retornar_200 PASSED [ 91%]
apps/autoria/tests/test_integracao_aula11.py::test_criar_flashcard_deve_retornar_201 PASSED [100%]
============================= 12 passed in 1.97s ==============================
```
- **Link do CI (se houver):** não se aplica.

## 9. Decisões e dificuldades
- **Segurança:** 401 sem token (teste 9), 403 com JWT válido de aluno em rota de autoria (testes 5 e 10) e 200 com JWT de autor na mesma rota (teste 11). O JWT é gerado de verdade, sem `force_authenticate`.
- **Bugs encontrados pelos testes (se houver):** nenhum. Duas divergências entre o enunciado e a API, tratadas nos testes: (1) a criação não devolve header `Location` (o serializer não expõe campo `url`), então o teste 1 confere o corpo e o teste 6 prova que o recurso é alcançável pela rota de detalhe; (2) o slug é gerado pelo servidor com sufixo (`-2`, `-3`), então não existe 409 por slug duplicado, e o cenário de erro de autorização usa 403.
- **Dificuldades:** adaptar o conceito de `@SpringBootTest` para pytest-django, e trocar o PostgreSQL padrão por SQLite em memória apenas na execução. A API usa um envelope de erro próprio (`{"error": {"code", "message", "details"}}`), não o `{"detail": ...}` do DRF. No SQLite, `select_for_update` não gera `FOR UPDATE`, então o teste existente `test_transicao_trava_a_linha` falha nesse banco; ele fica fora desta entrega e passa no PostgreSQL.

## 10. Checklist de entrega
- [x] Todos os testes passam com o comando da seção 7, mais de uma vez seguida
- [x] Todos os endpoints dos controllers escolhidos estão na matriz da seção 4
- [x] Cada cenário listado na seção 5 existe no código
- [x] Cada arquivo criado ou alterado está listado na seção 6
- [x] Mínimos da Seção 3.1 do enunciado atendidos (pelo menos 12 testes de integração)
- [x] Nenhum teste com skip, sem asserção ou com sleep
- [x] Service e repository são reais nos testes de integração
- [ ] Professor adicionado como reviewer
