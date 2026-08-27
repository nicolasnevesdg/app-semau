# Template “Ingresso confirmado — XVI SEMAU”

## Assunto

`{{to_name}}, seu ingresso da XVI SEMAU chegou!`

## Destinatário

No campo **To Email**, use `{{to_email}}`.

## Variáveis do template

- `{{to_name}}`: nome do participante.
- `{{to_email}}`: e-mail usado na compra.
- `{{user_token}}`: token pessoal de cinco caracteres.

## Corpo do e-mail

Cole o conteúdo completo de `ingresso-xvi-semau.html` no editor HTML do EmailJS.

## Identificadores necessários para a integração

Depois de salvar o template no EmailJS, anote:

- Public Key;
- Service ID;
- Template ID.

Esses três identificadores conectam o template ao envio automático e ao botão “Enviar ingresso” do Admin.
