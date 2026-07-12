# Zerei Rotas Closed Beta Checklist

Use one copy of this checklist for each closed-beta tester. Do not store passwords, authentication tokens, or private delivery data in the completed document.

## Tester Info

- Nome:
- WhatsApp:
- Cidade:
- Plataforma principal:
- Modelo do celular:
- Versão do Android:
- Data de início do teste:

## Installation

- [ ] Install the internal Android build, not Expo Go.
- [ ] Confirm the launcher icon shows the official Zerei Rotas mark.
- [ ] Open the app from the phone launcher.
- [ ] Confirm the splash screen uses the dark navy background and centered logo.

## Login

- [ ] Create an account with a disposable beta e-mail or approved test account.
- [ ] Confirm e-mail if Supabase requires confirmation.
- [ ] Sign in successfully.
- [ ] Open Perfil.
- [ ] Complete Nome, WhatsApp, Cidade, Estado, Tipo de veículo, and Plataforma principal.
- [ ] Sign out and sign back in.
- [ ] Confirm profile data persists.

## Import

- [ ] Open Painel.
- [ ] Tap Importar Planilha.
- [ ] Select a real Shopee spreadsheet.
- [ ] Confirm the preview loads without returning to login.
- [ ] Confirm package count and stop count look reasonable.
- [ ] Confirm invalid files show a Portuguese error instead of crashing.

## Optimization And Review

- [ ] Open Resumo da Importação.
- [ ] Open Revisar Rota.
- [ ] Confirm stop order numbers follow the spreadsheet/imported order.
- [ ] Confirm stops without a valid spreadsheet stop number appear as `#P`.
- [ ] Confirm duplicate-address warnings name the matching stop numbers.
- [ ] Use Subir and Descer on at least one stop.
- [ ] Use Mover with an invalid position and confirm the validation message.
- [ ] Use Mover with a valid position and confirm the order updates.
- [ ] Leave Revisar Rota and return.
- [ ] Confirm the customized order remains.

## Map And Navigation

- [ ] Tap Mostrar no mapa.
- [ ] Confirm valid stops appear as markers or ordered list items.
- [ ] Confirm there is no ocean/outlier marker.
- [ ] Confirm unresolved stops stay visible in the ordered route list.
- [ ] Confirm unresolved stops show Insira o endereço manualmente where appropriate.
- [ ] Tap Copiar endereço for an unresolved stop.
- [ ] Tap Navegar or the map/pin action for a stop.
- [ ] Confirm Google Maps opens with street and number only, without apartment/floor/complement.
- [ ] Return to Revisar Rota.

## Deliveries

- [ ] Tap Começar entrega.
- [ ] Confirm tabs are hidden during execution.
- [ ] Confirm the route name appears near the top.
- [ ] Confirm the current stop shows street and number as the hero address.
- [ ] Confirm packages start unselected.
- [ ] Select one package individually.
- [ ] Clear that package individually.
- [ ] Use Selecionar tudo for one address group.
- [ ] Confirm other address groups are not selected.
- [ ] Use Limpar seleção for that address group.
- [ ] Select all required packages.
- [ ] Confirm PEGUEI OS X PACOTES enables only when all required packages are selected.
- [ ] Confirm separation does not mark packages as delivered.
- [ ] Move to delivery phase.
- [ ] Tap Entregue neste endereço for one address group.
- [ ] Confirm only that address group is completed.
- [ ] Confirm final address group advances to the next stop.

## Occurrences

- [ ] Tap Ocorrência on a specific package.
- [ ] Confirm Selecionar ocorrência opens directly.
- [ ] Register a reason.
- [ ] Confirm the package is not overwritten as delivered.
- [ ] Use Registrar ocorrência under an address group with one pending package.
- [ ] Confirm it opens reason selection directly.
- [ ] Use Registrar ocorrência under an address group with multiple pending packages.
- [ ] Confirm it shows only packages from that address group.
- [ ] Resolve one occurrence as Entregue.
- [ ] Resolve one occurrence as Devolvido ao Hub.
- [ ] Edit an occurrence reason or result.
- [ ] Delete an occurrence after confirmation.
- [ ] Open the Ocorrências tab and confirm pending/resolved sections make sense.

## Offline

- [ ] Start a route and mark at least one package delivered.
- [ ] Turn off internet.
- [ ] Reopen the app.
- [ ] Confirm the active route remains available locally.
- [ ] Register or edit one occurrence while offline if practical.
- [ ] Confirm local route work is not blocked by Supabase/network failure.
- [ ] Turn internet back on.
- [ ] Confirm the app remains stable.

## Route Recovery

- [ ] Rename the route.
- [ ] Move at least one stop.
- [ ] Start delivery.
- [ ] Mark one package delivered.
- [ ] Register one occurrence.
- [ ] Save one PlaceInfo note if practical.
- [ ] Close the app fully.
- [ ] Reopen the app.
- [ ] Confirm the active route appears as Em rota.
- [ ] Confirm Continuar appears.
- [ ] Confirm delivered package, occurrence, route name, current stop, and route order persisted.
- [ ] Confirm "Rota restaurada. Você pode continuar a entrega." appears only once.

## History And Completion

- [ ] Complete the route if practical.
- [ ] Confirm the completed route appears in Histórico.
- [ ] Confirm it does not restore as active after reopening.
- [ ] Rename the completed route.
- [ ] Confirm the new name persists after tab changes and reload.
- [ ] Confirm completed-route occurrence summaries remain available.

## Performance

- [ ] Import and review a route with at least 80 packages if available.
- [ ] Scroll Revisar Rota.
- [ ] Scroll Executar Rota.
- [ ] Open Mostrar no mapa.
- [ ] Confirm no obvious freezing or repeated loading loops.
- [ ] Confirm taps respond reliably on the tested Android device.

## Known Beta Limitations

- Payments and paywall are not active yet.
- Route progress is local to the device and is not cloud-synced between phones.
- Reinstalling the app or clearing app storage can remove local route progress.
- Live geocoding is not configured; some stops may require manual address copy/navigation.
- iOS physical-device behavior is not validated for this beta.
- Android tab hit-area behavior must remain validated on each tester device.
- Some Supabase profile or funnel actions may wait for internet, but local route execution should continue.

## Feedback Questions

1. O import funcionou com sua planilha real?
2. A Revisar Rota ajudou antes de sair para entrega?
3. O mapa e o botão Navegar ajudaram?
4. As ocorrências ficaram fáceis de registrar e resolver?
5. A recuperação da rota depois de fechar o app funcionou?
6. O que confundiu durante a entrega?
7. O que ficou lento ou difícil com uma mão?
8. O que faria você pagar R$9,90/mês?
9. Qual função está faltando?
10. Você usaria de novo amanhã?

## Test Outcome

- Data de conclusão:
- Fluxo concluído: Sim / Não / Parcial
- Problema bloqueador encontrado:
- Observações principais:
- Autorização para contato de acompanhamento: Sim / Não
