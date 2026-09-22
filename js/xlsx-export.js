const encoder = new TextEncoder();

const tabelaCrc32 = (() => {
    const tabela = new Uint32Array(256);
    for (let indice = 0; indice < 256; indice++) {
        let valor = indice;
        for (let bit = 0; bit < 8; bit++) {
            valor = (valor & 1) ? (0xedb88320 ^ (valor >>> 1)) : (valor >>> 1);
        }
        tabela[indice] = valor >>> 0;
    }
    return tabela;
})();

function crc32(bytes) {
    let valor = 0xffffffff;
    for (const byte of bytes) valor = tabelaCrc32[(valor ^ byte) & 0xff] ^ (valor >>> 8);
    return (valor ^ 0xffffffff) >>> 0;
}

function uint16(valor) {
    const bytes = new Uint8Array(2);
    new DataView(bytes.buffer).setUint16(0, valor, true);
    return bytes;
}

function uint32(valor) {
    const bytes = new Uint8Array(4);
    new DataView(bytes.buffer).setUint32(0, valor >>> 0, true);
    return bytes;
}

function juntarBytes(partes) {
    const tamanho = partes.reduce((total, parte) => total + parte.length, 0);
    const resultado = new Uint8Array(tamanho);
    let deslocamento = 0;
    partes.forEach(parte => {
        resultado.set(parte, deslocamento);
        deslocamento += parte.length;
    });
    return resultado;
}

function horarioDos(valor) {
    const data = valor instanceof Date ? valor : new Date(valor);
    const dataValida = Number.isNaN(data.getTime()) ? new Date() : data;
    const ano = Math.max(1980, dataValida.getFullYear());
    const hora = (dataValida.getHours() << 11) | (dataValida.getMinutes() << 5) | Math.floor(dataValida.getSeconds() / 2);
    const dia = ((ano - 1980) << 9) | ((dataValida.getMonth() + 1) << 5) | dataValida.getDate();
    return { hora, dia };
}

function criarZip(arquivos) {
    const locais = [];
    const centrais = [];
    let deslocamento = 0;
    const agora = horarioDos(new Date());

    arquivos.forEach(arquivo => {
        const nome = encoder.encode(arquivo.nome);
        const conteudo = typeof arquivo.conteudo === 'string' ? encoder.encode(arquivo.conteudo) : arquivo.conteudo;
        const checksum = crc32(conteudo);
        const cabecalhoLocal = juntarBytes([
            uint32(0x04034b50), uint16(20), uint16(0x0800), uint16(0),
            uint16(agora.hora), uint16(agora.dia), uint32(checksum),
            uint32(conteudo.length), uint32(conteudo.length), uint16(nome.length), uint16(0), nome
        ]);
        locais.push(cabecalhoLocal, conteudo);

        const cabecalhoCentral = juntarBytes([
            uint32(0x02014b50), uint16(20), uint16(20), uint16(0x0800), uint16(0),
            uint16(agora.hora), uint16(agora.dia), uint32(checksum),
            uint32(conteudo.length), uint32(conteudo.length), uint16(nome.length),
            uint16(0), uint16(0), uint16(0), uint16(0), uint32(0), uint32(deslocamento), nome
        ]);
        centrais.push(cabecalhoCentral);
        deslocamento += cabecalhoLocal.length + conteudo.length;
    });

    const diretorio = juntarBytes(centrais);
    const fim = juntarBytes([
        uint32(0x06054b50), uint16(0), uint16(0), uint16(arquivos.length),
        uint16(arquivos.length), uint32(diretorio.length), uint32(deslocamento), uint16(0)
    ]);
    return juntarBytes([...locais, diretorio, fim]);
}

function escaparXml(valor) {
    return String(valor ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&apos;');
}

function celulaTexto(referencia, valor, estilo = 0) {
    const estiloXml = estilo ? ` s="${estilo}"` : '';
    return `<c r="${referencia}" t="inlineStr"${estiloXml}><is><t xml:space="preserve">${escaparXml(valor)}</t></is></c>`;
}

function celulaNumero(referencia, valor, estilo = 0) {
    const estiloXml = estilo ? ` s="${estilo}"` : '';
    return `<c r="${referencia}"${estiloXml}><v>${Number(valor)}</v></c>`;
}

function serialDataLocal(data) {
    return (Date.UTC(data.getFullYear(), data.getMonth(), data.getDate()) / 86400000) + 25569;
}

function fracaoHoraLocal(data) {
    return ((data.getHours() * 3600) + (data.getMinutes() * 60) + data.getSeconds()) / 86400;
}

export function criarPlanilhaSorteados(registros) {
    const cabecalhos = ['Nº', 'Nome sorteado', 'Data', 'Horário', 'Turno / filtro'];
    const linhas = [
        `<row r="1" ht="24" customHeight="1">${cabecalhos.map((cabecalho, indice) => celulaTexto(`${String.fromCharCode(65 + indice)}1`, cabecalho, 1)).join('')}</row>`
    ];

    registros.forEach((registro, indice) => {
        const numeroLinha = indice + 2;
        const data = new Date(Number(registro.sorteadoEmMs) || registro.sorteadoEmIso || Date.now());
        linhas.push(
            `<row r="${numeroLinha}">`
            + celulaNumero(`A${numeroLinha}`, indice + 1)
            + celulaTexto(`B${numeroLinha}`, registro.nome)
            + celulaNumero(`C${numeroLinha}`, serialDataLocal(data), 2)
            + celulaNumero(`D${numeroLinha}`, fracaoHoraLocal(data), 3)
            + celulaTexto(`E${numeroLinha}`, registro.turnoTexto || registro.turno || '')
            + '</row>'
        );
    });

    const ultimaLinha = Math.max(1, registros.length + 1);
    const planilha = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<dimension ref="A1:E${ultimaLinha}"/>
<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>
<sheetFormatPr defaultRowHeight="20"/>
<cols><col min="1" max="1" width="7" customWidth="1"/><col min="2" max="2" width="42" customWidth="1"/><col min="3" max="3" width="14" customWidth="1"/><col min="4" max="4" width="13" customWidth="1"/><col min="5" max="5" width="36" customWidth="1"/></cols>
<sheetData>${linhas.join('')}</sheetData>
<autoFilter ref="A1:E${ultimaLinha}"/>
</worksheet>`;

    const estilos = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<numFmts count="2"><numFmt numFmtId="164" formatCode="dd/mm/yyyy"/><numFmt numFmtId="165" formatCode="hh:mm:ss"/></numFmts>
<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><color rgb="FFFFFFFF"/><sz val="11"/><name val="Calibri"/></font></fonts>
<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF0C4638"/><bgColor indexed="64"/></patternFill></fill></fills>
<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="4"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf><xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="165" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/></cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;

    const arquivos = [
        { nome: '[Content_Types].xml', conteudo: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>` },
        { nome: '_rels/.rels', conteudo: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>` },
        { nome: 'xl/workbook.xml', conteudo: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Sorteados" sheetId="1" r:id="rId1"/></sheets></workbook>` },
        { nome: 'xl/_rels/workbook.xml.rels', conteudo: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>` },
        { nome: 'xl/styles.xml', conteudo: estilos },
        { nome: 'xl/worksheets/sheet1.xml', conteudo: planilha }
    ];

    return new Blob([criarZip(arquivos)], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
}
