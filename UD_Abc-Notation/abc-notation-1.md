## Abc-Notation Teil 1

Die Abc-Musiknotation wurde erfunden, um Melodien in Computern zu
erfassen. Sie eignet sich aber auch gut für handschriftliche Notizen, um
Melodien aufschreiben, wenn man kein Notenpapier zur Hand hat. Es genügt
ein Schmierzettel, oder am Computer ein Text-Eingabefeld.

Abc-Notation ist zwar nicht ganz so übersichtlich wie herkömmliche
Musiknoten, aber doch lesbar genug, so dass Musiker sie mit etwas Übung
vom Blatt spielen können. Gleichzeitig ist sie auch so exakt, dass
[Computer][] sie interpretieren können – z. B. um sie zu
[transponieren][], abzuspielen oder automatisch in klassische
Notenschrift zu übertragen.

Die Abc-Notation ist heute vor allem im englischen Sprachraum bei
Folkmusikern und Freunden traditioneller Musik verbreitet. Im Internet
gibt es Sammlungen volkstümlicher Weisen in Abc. Freunde traditioneller
irischer, britischer oder nordamerikanischer Musik geben ihre Weisen
häufig in Form von Abc weiter.

### Inhaltsverzeichnis

[Kopffelder][] · [Noten][] · [Notenwerte][] · [Pausen][] · [Taktstriche,
Wiederholungszeichen][] · [Versetzungszeichen][] · [Punktierung][] ·
[Triolen][] · [Halte- und Bindebögen][] · [Staccato][] · [Akkorde][] ·
[Sonstiges][]

### Beispiel

Die Melodie von „Alle meine Entchen“ sieht in Abc-Notation so aus:

  ----------------------------------------------------------------------
  Abc-Notation           Umsetzung in herkömmliche Noten
  ---------------------- -----------------------------------------------
  X:1\                   ![Noten: Alle meine Entchen][]{width="100%"
  T:Alle meine Entchen\  height="130"}
  M:2/4\                 
  L:1/8\                 
  K:C\                   
  C D E F | G2 G2 [|: A  
  A A A | G4 :|]\        
  F F F F | E2 E2 | G G  
  G G | C4 |]            
  ----------------------------------------------------------------------

### [Kopffelder][1]

Die ersten fünf Zeilen sind Kopffelder. Bei handschriftlichen Notizen
kann man die weglassen, aber zur elektronischen Verarbeitung sind sie
nötig:\
<span class="symb">X:</span> [Indexnummer][] – irgendeine fortlaufende
Nummer\
<span class="symb">T:</span> [Titel][] – der Name des Stücks\
<span class="symb">M:</span> [Metrum][] – z. B. Dreivierteltakt,
Viervierteltakt…\
<span class="symb">L:</span> Standard-[Notenwert][] – gibt an, ob
hauptsächlich Viertel, Achtel oder Sechzehntel gezählt werden\
<span class="symb">K:</span> [Tonart][]

Das Kopffeld „X:“ steht immer als erstes, und „K:“ immer als letztes,
unmittelbar vor der Melodie.\
Dazwischen können auch noch [weitere Kopffelder][] eingefügt werden.

### [Noten/Tonhöhe][1]

Die einzelnen Töne werden als Buchstaben notiert.\
Großbuchstaben stehen für die tieferen Töne, Kleinbuchstaben für die
höheren:

  Abc             Noten
  --------------- ---------------------------------------------------
  C D E F G A B   [Noten: untere Oktave][]{width="195" height="40"}
  c d e f g a b   [Noten: obere Oktave][]{width="196" height="39"}

Achtung bei „b“ und „h“: Es gilt hier die englische Schreibweise. Man
schreibt immer „b“ statt „h“! Wo wirklich das deutsche „b“ gemeint ist
(ein Halbton tiefer als h), schreibt man „b“ mit [Versetzungszeichen][].

[Für noch höhere Töne schreibt man Kleinbuchstaben mit Hochkommas,\
für noch tiefere Töne Großbuchstaben mit Kommas:][1]

  Abc                                        Noten
  ------------------------------------------ -------------------------------------------------
  c' d' e' f' g' a' b' c'' d'' e'' f'' g''   [Noch höhere Noten][]{width="337" height="63"}
  C B, A, G, F, E, D, C, B,, A,, G,,         [Noch tiefere Noten][]{width="292" height="42"}

Zwischen den Buchstaben dürfen Leerzeichen stehen, um die Melodie besser
lesbar zu machen. Man darf auch lückenlos hintereinander schreiben. Bei
kurzen Notenwerten macht das im Notenbild einen Unterschied:

  Abc               Noten
  ----------------- ----------------------------------------------------------------
  C D E F G CDEFG   [Noten mit Fähnchen und mit Balken][]{width="200" height="35"}

Lückenlose Schreibweise entspricht Noten mit Balken;\
Trennung durch Leerzeichen entspricht Noten mit Fähnchen.

### [Notenwerte][1]

Alle Noten bekommen standardmäßig den Notenwert, der im [Kopffeld
„L:“][] festgelegt wurde.\
Durch nachgestellte Ziffern wird dieser Notenwert vervielfacht:

  Abc              Mit L:1/8                                                    Mit L:1/4
  ---------------- ------------------------------------------------------------ ---------------------------------------------------------------
  a a2 a4 a8 a16   [Notenwerte: Achtel bis Doppel][]{width="170" height="35"}   [Notenwerte: Viertel bis Vierfach][]{width="225" height="38"}

Mit einem Schrägstrich werden Notenwerte verkürzt:

  Abc                 Mit L:1/8                                                   Mit L:1/4
  ------------------- ----------------------------------------------------------- -----------------------------------------------------------
  a a/ a/4 a/8 a/16   [Notenwerte: Achtel bis 128tel][]{width="66" height="38"}   [Notenwerte: Viertel bis 64tel][]{width="89" height="38"}

### [Pausen][1]

Pausen werden mit dem Buchstaben „z“ notiert. Sie bekommen standardmäßig
die Länge, die im [Kopffeld „L:“][] festgelegt wurde.\
Durch nachgestellte Ziffern wird diese Länge vervielfacht:

  Abc              Mit L:1/8                                                        Mit L:1/4
  ---------------- ---------------------------------------------------------------- ------------------------------------------------------------------
  z z2 z4 z8 z16   [Pausenzeichen: Achtel bis Doppelt][]{width="145" height="38"}   [Pausenzeichen: Viertel bis Vierfach][]{width="197" height="35"}

Mit einem Schrägstrich wird die Länge verkürzt:

  Abc                 Mit L:1/8                                   Mit L:1/4
  ------------------- ------------------------------------------- --------------------------------------------
  z z/ z/4 z/8 z/16   [Pausenzeichen][]{width="64" height="35"}   [Pausenzeichen][2]{width="82" height="35"}

### [Taktstriche, Wiederholungszeichen, Schlussstrich][1]

Ein senkrechter Strich „|“ stellt einen Taktstrich dar. Eckige Klammern
[ ] stellen dicke Striche dar, z. B. beim Schlussstrich:\
<span class="symb">|]</span>\
oder bei Wiederholungszeichen:\
<span class="symb">[|:   :|]</span>\
Wiederholungszeichen dürfen auch ohne eckige Klammern stehen:\
<span class="symb">|:   :|</span>\
Wo zwei Wiederholungszeichen aufeinandertreffen, schreibt man:\
<span class="symb">:|:</span>\
oder kürzer:\
<span class="symb">::</span>

Wo Wiederholungen unterschiedlich enden, schreibt man Ziffern 1 und 2
unmittelbar hinterm Taktstrich. Beispiel:

  ----------------------------------------------------------------------
  Abc-Notation             Umsetzung in Noten
  ------------------------ ---------------------------------------------
  X:1\                     [Noten: Fuchs du hast die Gans
  T:Fuchs du hast die Gans gestohlen][]{width="100%" height="136"}
  gestohlen\               
  M:C\                     
  L:1/8\                   
  K:C\                     
  C D E F G G G G [|: A F  
  c A G4 :|:\              
  G F F F F E E E |1 E D E 
  D C E G2 :|]2 E D E D C4 
  |]                       
  ----------------------------------------------------------------------

### [Versetzungszeichen][1]

Durch ein vorangestelltes „\^“ wird ein Ton um einen Halbton erhöht.
Dies entspricht in der Notenschrift dem [Kreuz][].\
Durch ein vorangestelltes „\_“ wird ein Ton um einen Halbton erniedrigt.
Dies entspricht in der Notenschrift dem [b][].\
Durch ein „=“ wird ein vorangegangenes Versetzungszeichen aufgelöst.
Dies entspricht in der Notenschrift dem [Auflösungszeichen][].\
Beispiel:

  Abc            Noten
  -------------- -----------------------------------------------------------
  G \^G \_G =G   [Noten mit Versetzungszeichen][]{width="106" height="36"}

Für Versetzungszeichen gelten in Abc-Notation dieselben Regeln wie in
herkömmlicher Notenschrift: Ein Versetzungszeichen gilt bis zum Ende des
Taktes, oder bis es aufgelöst wird. Vorzeichen, die sich ohnehin aus der
Tonart ergeben, muss man innerhalb der Melodie nicht notieren.

Doppelte Versetzungszeichen sind notierbar, indem man die
Versetzungszeichen doppelt schreibt, also „\^\^“ für [Doppelkreuz][]
bzw. „\_\_“ für [Doppel-b][].

### [Punktierung][1]

[Punktierte][] Noten kann man in Abc schreiben, indem man ihre Länge als
Vielfaches oder Bruchteil des [Standard-Notenwerts][Kopffeld „L:“]
angibt, z. B.:\
<span class="symb">g3</span> dreimal der Standard-Notenwert\
<span class="symb">g3/2</span> dreimal die Hälfte des
Standard-Notenwerts\
<span class="symb">g3/4</span> drei Viertel des Standard-Notenwerts.

Es gibt aber auch eine einfachere Möglichkeit: Meistens stehen
punktierte Noten ja als Päärchen zusammen mit einer entsprechend
verkürzten Note: [Punktierte Achtel mit Sechzehntel][]{width="14"
height="9"} Für solche Päärchen gibt es eine vereinfachte Schreibweise:\
<span class="symb">g\>a</span>\
Der Ton links vom „\>“ wird um die Hälfte verlängert, der Ton rechts vom
„\>“ entsprechend um die Hälfte verkürzt. Dasselbe funktioniert auch
umgekehrt mit dem Zeichen „\<“:\
<span class="symb">g\<a</span> entspricht einem verkürzten g mit
anschießendem punktierten a.

Man kann die Noten in so einem Päärchen wiederum mit den üblichen
Zeichen verlängern oder verkürzen, z. B.:\
Notenwerte verdoppeln: <span class="symb">g2\>a2</span> oder\
Notenwerte halbieren: <span class="symb">g/\>a/</span>

Innerhalb solcher Päärchen dürfen keine Leerzeichen vorkommen.

### [Triolen][1]

[Triolen][3] [Triole][]{width="20" height="19"} werden in Abc so
notiert: <span class="symb">(3EFG</span>

Auch andere Teilungen sind ebenso notierbar:\
<span class="symb">(2EF</span> Duole (2 Töne im Zeitraum von dreien)\
<span class="symb">(3EFG</span> Triole (3 Töne im Zeitraum von zweien)\
<span class="symb">(4EFGA</span> Quartole (4 Töne im Zeitraum von
dreien)\
<span class="symb">(5EFGAG</span> Quintole (5 Töne im Zeitraum von
zweien oder dreien \*)\
<span class="symb">(6EFGAGF</span> Sextole (6 Töne im Zeitraum von
zweien)\
<span class="symb">(7EFGAGFE</span> Septole (7 Töne im Zeitraum von
zweien oder dreien \*)\
<span class="symb">(8EFGAGFED</span> Oktole (8 Töne im Zeitraum von
dreien)\
<span class="symb">(9EFGAGFEDC</span> Nontole (9 Töne im Zeitraum von
zweien oder dreien \*)

\* Der Zeitraum von dreien gilt bei ungeraden Taktarten wie 3/4, 3/8,
9/8…\
  Der Zeitraum von zweien gilt bei geraden Taktarten wie C, 4/4, 2/4…

Längere Abschnitte mit außergewöhnlicher Teilung lassen sich auch wie
folgt notieren:\
<span class="symb">(p:q:r</span>\
Für <span class="symb">p</span> wird die Anzahl der Noten eingesetzt,
die in den Zeitraum <span class="symb">q</span> passen soll.\
Anstelle von <span class="symb">r</span> wird die Anzahl von Noten
eingesetzt, für die diese Regel gelten soll.

### [Bögen][1]

[Haltebögen][] werden in Abc mit Bindestrich notiert:

  Abc          Noten
  ------------ ------------------------------------------
  F G-G A-|A   [Haltebögen][4]{width="137" height="34"}

[Bindebögen][] und [Phrasierungsbögen][] werden mit runden Klammern
notiert:\
Klammer auf für den Beginn eines Bogens,\
Klammer zu für das Ende eines Bogens.

Unmittelbar nach der öffnenden Klammer und unmittelbar vor der
schließenden Klammer darf kein Leerzeichen stehen.\
Man kann Klammern auch ineinander verschachteln:

  Abc                  Noten
  -------------------- ----------------------------------------------------
  (F2 (GABc) de-|ef)   [Binde- und Haltebögen][]{width="184" height="41"}

### [Staccato][1]

Staccato wird mit einem vorangestellten Punkt notiert:

  Abc                    Noten
  ---------------------- ---------------------------------------------
  c2 d B | .A2 .G2 .F2   [Staccato-Noten][]{width="144" height="34"}

### [Akkorde][1]

Mit eckigen Klammern [ ] kann man Noten übereinander stapeln und so
Akkorde aus einzelnen Tönen zusammenbauen:

  Abc                  Noten
  -------------------- -------------------------------------------
  G [FA][DGB] [CEGc]   [Akkord-Noten][]{width="103" height="37"}

Innerhalb der eckigen Klammern dürfen keine Leerzeichen stehen, und es
ist üblich, die Töne darin in aufsteigender Reihenfolge vom tiefsten bis
zum höchsten zu notieren.

Eckige Klammern können auch dazu dienen, mehrere Stimmen in ein
Notensystem zu schreiben:

  Abc                       Noten
  ------------------------- --------------------------------------------
  [G/g/][Af] [B2d2][c4c4]   [Akkord-Noten][5]{width="104" height="40"}

[Sollen Akkorde nur als Gitarrengriffe über oder unter den Noten
erscheinen, so schreibt man sie in Anführungszeichen:][1]

  Abc                                     Noten
  --------------------------------------- ---------------------------------------------
  G/B/ | "C" c G "em" G E/G/ | "dm7" A2   [Gitarrengriffe][]{width="189" height="42"}

Für Gitarrengriffe gelten folgende Regeln:\
Man schreibt zuerst einen Buchstaben A bis G,\
dann eventuell \# oder b,\
dann eventuell m für Moll, oder min, maj, sus, dim, +, 7, 9, oder was
auch immer,\
dann eventuell noch einen Schrägstrich / und einen Basston.

### [Zeilenumbruch][1]

Wenn Abc in klassische Notenschrift umgewandelt wird, wird aus einer
Zeile Abc normalerweise eine Notenzeile gemacht. Sollte eine Zeile aber
zu lang sein, kann auch vorher ein Zeilenumbruch passieren. Ein „\\“ am
Ende einer Abc-Zeile unterdrückt den Zeilenumbruch, ein „!“ erzwingt
ihn.

### Aufstrich, Abstrich

Speziell für Streichinstrumente sind die Zeichen\
u (up-bow) für [Aufstrich][] und\
v (down-bow) für [Abstrich][Aufstrich].\
Sie können den Noten vorangestellt werden, um die Strichrichtung
anzuzeigen.

Bei der Ziehharmonika gibt man mit diesen Zeichen an, ob der Balg
auseinandergezogen oder zusammengedrückt wird.

### Kommentare

Nach einem Prozentzeichen % können in Abc beliebige Kommentare
hinzugefügt werden. Computerprogramme ignorieren alles, was zwischen
einem Prozentzeichen und dem Ende der betreffenden Zeile steht.

### Reihenfolge

Falls bei einer Note viele Eigenschaften zusammentreffen, werden sie in
folgender Reihenfolge notiert:

1.  "[Gitarrengriff][]"
2.  [Staccato][] . oder [anderer Akzent][]
3.  [Versetzungszeichen][]
4.  [Note][Noten]
5.  [Oktavenzeichen][] ' oder ,
6.  Änderung des [Notenwerts][Notenwerte]

### Verweise

Im [2. Teil][] dieser Anleitung werden Kopffelder und Erweiterungen des
Abc-Standards beschrieben.\
[Abc notation home page][] · [Software][Computer] · [How to interpret
abc music notation][] · [Abc converter at mandolintab.net][]

<div
style="text-align:left;margin-top:15px;margin-bottom:15px;margin-left:30px;">

</div>

* * * * *

[\<\< vorige][] / [nächste Seite][2. Teil] \>\>   ·  
[Musik][\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\<\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\<
vorige]   ·   [Impressum][]   ·  
[http://Penzeng.de][]/[Musik][\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\<\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\<
vorige]

[1]: [Indexnummer]: http://penzeng.de/Geige/Abc2.htm\#X [Titel]:
http://penzeng.de/Geige/Abc2.htm\#T [Metrum]:
http://de.wikipedia.org/wiki/Metrum\_(Musik) [Notenwert]:
http://de.wikipedia.org/wiki/Notenwert [Tonart]:
http://de.wikipedia.org/wiki/Tonart [weitere Kopffelder]:
http://penzeng.de/Geige/Abc2.htm\#Weitere [Noten: untere Oktave]:
./Abc-Notation-1_files/UntereOktave.gif [Noten: obere Oktave]:
./Abc-Notation-1_files/ObereOktave.gif [Noch höhere Noten]:
./Abc-Notation-1_files/NochHoeher.gif [Noch tiefere Noten]:
./Abc-Notation-1_files/NochTiefer.gif [Noten mit Fähnchen und mit
Balken]: ./Abc-Notation-1_files/FaehnchenBalken.gif [Kopffeld „L:“]:
http://penzeng.de/Geige/Abc2.htm\#L [Notenwerte: Achtel bis Doppel]:
./Abc-Notation-1_files/Notenwerte8.gif [Notenwerte: Viertel bis
Vierfach]: ./Abc-Notation-1_files/Notenwerte4.gif [Notenwerte: Achtel
bis 128tel]: ./Abc-Notation-1_files/NotenwerteH8.gif [Notenwerte:
Viertel bis 64tel]: ./Abc-Notation-1_files/NotenwerteH4.gif
[Pausenzeichen: Achtel bis Doppelt]: ./Abc-Notation-1_files/Pausen8.gif
[Pausenzeichen: Viertel bis Vierfach]:
./Abc-Notation-1_files/Pausen4.gif [Pausenzeichen]:
./Abc-Notation-1_files/PausenH8.gif [2]:
./Abc-Notation-1_files/PausenH4.gif [Noten: Fuchs du hast die Gans
gestohlen]: ./Abc-Notation-1_files/FuchsDuHast.gif [Kreuz]:
http://de.wikipedia.org/wiki/Kreuz\_(Notenschrift) [b]:
http://de.wikipedia.org/wiki/B\_(Notenschrift) [Auflösungszeichen]:
http://de.wikipedia.org/wiki/Aufl%C3%B6sungszeichen [Noten mit
Versetzungszeichen]: ./Abc-Notation-1_files/Vorzeichen.gif
[Doppelkreuz]: http://de.wikipedia.org/wiki/Doppelkreuz\_(Notenschrift)
[Doppel-b]: http://de.wikipedia.org/wiki/Doppel-b [Punktierte]:
http://de.wikipedia.org/wiki/Punktierung\_(Musik) [Punktierte Achtel mit
Sechzehntel]: ./Abc-Notation-1_files/N8p16.gif [3]:
http://de.wikipedia.org/wiki/Triole [Triole]:
./Abc-Notation-1_files/N3cde.gif [Haltebögen]:
http://de.wikipedia.org/wiki/Haltebogen [4]:
./Abc-Notation-1_files/Halteboegen.gif [Bindebögen]:
http://de.wikipedia.org/wiki/Bindebogen [Phrasierungsbögen]:
http://de.wikipedia.org/wiki/Phrasierungsbogen [Binde- und Haltebögen]:
./Abc-Notation-1_files/Boegen.gif [Staccato-Noten]:
./Abc-Notation-1_files/StaccatoN.gif [Akkord-Noten]:
./Abc-Notation-1_files/AkkordN.gif [5]:
./Abc-Notation-1_files/2Stimmig.gif [Gitarrengriffe]:
./Abc-Notation-1_files/AkkordG.gif [Aufstrich]:
http://penzeng.de/Geige/Streichen.htm\#AufAbstrich [Gitarrengriff]:
http://penzeng.de/Geige/Abc.htm\#Gitarrengriff [anderer Akzent]:
http://penzeng.de/Geige/Abc2.htm\#Verzierungen [Oktavenzeichen]:
http://penzeng.de/Geige/Abc.htm\#HoeherTiefer [2. Teil]:
http://penzeng.de/Geige/Abc2.htm [Abc notation home page]:
http://abcnotation.com/ [How to interpret abc music notation]:
http://www.lesession.co.uk/abc/abc_notation.htm [Abc converter at
mandolintab.net]: http://mandolintab.net/abcconverter.php [\<\< vorige]:
http://penzeng.de/Musik [Impressum]:
http://penzeng.de/InEigenerSache.htm [http://Penzeng.de]:
http://penzeng.de/

  [Computer]: http://abcnotation.com/software
  [transponieren]: http://de.wikipedia.org/wiki/Transposition_(Musik)
  [Kopffelder]: http://penzeng.de/Geige/Abc.htm#Kopffelder
  [Noten]: http://penzeng.de/Geige/Abc.htm#Noten
  [Notenwerte]: http://penzeng.de/Geige/Abc.htm#Notenwerte
  [Pausen]: http://penzeng.de/Geige/Abc.htm#Pausen
  [Taktstriche, Wiederholungszeichen]: http://penzeng.de/Geige/Abc.htm#Taktstriche
  [Versetzungszeichen]: http://penzeng.de/Geige/Abc.htm#Vorzeichen
  [Punktierung]: http://penzeng.de/Geige/Abc.htm#Punktierung
  [Triolen]: http://penzeng.de/Geige/Abc.htm#Triolen
  [Halte- und Bindebögen]: http://penzeng.de/Geige/Abc.htm#Boegen
  [Staccato]: http://penzeng.de/Geige/Abc.htm#Staccato
  [Akkorde]: http://penzeng.de/Geige/Abc.htm#Akkorde
  [Sonstiges]: http://penzeng.de/Geige/Abc.htm#Sonstiges
  [Noten: Alle meine Entchen]: ./Abc-Notation-1_files/AlleMeineEntchen.gif
