'use strict'

export const htmlChunk = `

<p id="id_1">par some text</p>
<p id="id_2">par some other text </p>
<p id="id_3">par with alink <a id="aid_1" href="xxx#fn_1">[[z1]]</a></p>
<p id="id_4" class="ptext">par p-text-par <a id="aid_2" href="xxx#fn_2">z2</a></p>
<ul id="ulid_1" class="list">
  <li id="liid_1">line string 1</li>
  <li id="liid_2">line string 2</li>
</ul>
<p id="fn_1"> footnote fn_1 text </p>
<p id="fn_2"> footnote fn_2 text </p>
<p id="id_2">par some other text </p>

`

// practical value.<a id="FNanchor_76_76"/><a href="chapters/item19/OEBPS/@public@vhost@g@gutenberg@html@files@39508@39508-h@39508-h-14.htm.html#Footnote_76_76" class="fnanchor pginternal">[76]</a></p>

// <p><a id="Footnote_76_76"></a><a href="chapters/item11/OEBPS/@public@vhost@g@gutenberg@html@files@39508@39508-h@39508-h-6.htm.html#FNanchor_76_76" class="pginternal"><span class="label">[76]</span></a> I am well aware

// <a - не первый child
// - а в footnote - первый


//

// file:///tmp/.private/michael/atril-751/The_Myth_of_Sisyphus.epubBHBGP0/OEBPS/Text/Endnote05.xhtml
// file:///tmp/.private/michael/atril-751/The_Myth_of_Sisyphus.epubBHBGP0/OEBPS/Text/Piece01.Chapter01.xhtml#endnote05
