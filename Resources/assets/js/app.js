// Konstansok
var VariableCount=4;
var VariableNames = new Array("A","B","C","D");
var Width  = new Array(0,2,2,4,4);				// Ktábla szélessége
var Height = new Array(0,2,2,2,4);				// Ktábla magassága
var BitOrder = new Array(0,1,3,2);				// bitek sorrendje a Ktáblában
var BackgroundColor="white";
var AllowDontCare=false;
var DontCare = "X";

// Változók (itt inicializálva)
var TruthTable = new Array();					// Igazságtábla structure[row][variable]
var KMap = new Array();							// KMap[across][down]
var Equation = new Array();						// Megoldás eredménye
var FunctionText = "";							// F(ABCD)=
var EquationHighlightColor = "rgb(243,194,86)";
var Heavy = 20;

for (i=0; i<Math.pow(2,VariableCount); i++)
{
	Equation[i] = new Array();					// Az összes kifejezésnek a result funkcióban
	Equation[i].ButtonUIName = "EQ" + i;		//  HTML ID-k generálásához
	Equation[i].Expression = "";				// HTML szöveg a kifejezésekhez
	Equation[i].Rect = null;					// téglalap a kifejezésekhez
	Equation.UsedLength=0;						// # a kifejezéseknek az aktuális result funkcióban
}

Equation.UsedLength=1;
Equation[0].Expression="0";

// Az igazságtábla és a ktábla inicializálása a megadott változóval
function InitializeTables(VarCount)
{
	TruthTable = new Array();
	KMap = new Array();

	VariableCount = VarCount;
	KMap.Width=Width[VariableCount];
	KMap.Height=Height[VariableCount];

	for (i=0; i<Math.pow(2,VariableCount); i++)
	{
		TruthTable[i] = new Array();
		TruthTable[i].Index = i;
		TruthTable[i].Name = i.toString(2);
		TruthTable[i].ButtonUIName = "TT"+TruthTable[i].Name;
		TruthTable[i].TTROWUIName = "TTROW" + TruthTable[i].Name;
		for (j=0; j<Math.pow(2,VariableCount); j++)
		{
			TruthTable[i][j] = new Array();
			TruthTable[i][j].Variable = (i & (1<<(VariableCount-(1+j)))?1:0)?true:false;
			TruthTable[i][j].Name = VariableNames[j];
			TruthTable[i][j].KMapEntry = null;
		}
	}

	KMap.XVariables = KMap.Width/2;
	KMap.YVariables = KMap.Height/2;

	for (w=0; w<KMap.Width; w++)
	{
		KMap[w]=new Array();
		for (h=0; h<KMap.Height; h++)
		{
			KMap[w][h]=new Array();
			KMap[w][h].Value = false;
			mapstr = BinaryString(BitOrder[w],KMap.XVariables) + BinaryString(BitOrder[h],KMap.YVariables);
			mapval = parseInt(mapstr,2);
			KMap[w][h].TruthTableEntry = TruthTable[mapval];
			KMap[w][h].TruthTableEntry.KMapEntry = KMap[w][h];
			KMap[w][h].ButtonUIName = "KM" + KMap[w][h].TruthTableEntry.Name;
			KMap[w][h].TDUIName = "TD" + KMap[w][h].TruthTableEntry.Name;
			KMap[w][h].Covered = false;
			KMap[w][h].Variable = new Array();
			for (i=0; i<VariableCount; i++)
			{
				KMap[w][h].Variable[i] = KMap[w][h].TruthTableEntry[i].Variable;
			}
		}
	}

	FunctionText = "ƒ(";
	for (i=0; i<VariableCount; i++)
	{
		FunctionText += VariableNames[i];
	}
	FunctionText+=")";
}

InitializeTables(VariableCount);

// Meghatározza a színét a boolean értéknek
//   Az várt értékek: "1", "0", or "X"
function HighlightColor( Value )
{
	if (Value=="1") return "rgb(200,90,60)";
	if (Value=="0") return "rgb(0,195,151)";
	return "gray";
}

//Meghatározza a színét a szövegkiemelésnek
//    Value is expected to be "1", "0", or "X"
function RectHighlightColor( Value )
{
	return EquationHighlightColor;
}

// Kód initializálása (beállítja a képernyőképet)
function Load()
{
	ChangeVariableNumber( VariableCount );
	if (PageParameter("DontCare")=="true")
	{
		ToggleDontCare();
	}
}

window.onload = Load;

// létrehozza a téglalap típust
function CreateRect( x,y,w,h )
{
	var Obj=new Array();
	Obj.x = x;
	Obj.y = y;
	Obj.w = w;
	Obj.h = h;
	return Obj;
}

// Két három kimenetelű 'boolean' összehasonlítása (0, 1 vagy X)
function Compare( Value1, Value2 )
{
	if ( (Value1 == Value2) || (Value1==DontCare) || (Value2==DontCare) )
	{
		return true;
	}
	else
	{
		return false;
	}
}

// Meghatározza, hogy a téglalap passzol-e a Ktáblába: Passzol, ha minden négyzete a téglalapnak
// passzol (összegasonlítva) a tesztértékkel.
// Feltételezi, hogy a bal felső téglalap része a Ktáblának
// Feltételezi, hogy a téglalap nem nagyobb a Ktáblánál
function TestRect( Rect, TestValue )
{
	var dx=0;
	var dy=0;
	for (dx=0; dx<Rect.w; dx++)
	{
		for (dy=0; dy<Rect.h; dy++)
		{
			var Test = KMap[(Rect.x+dx)%KMap.Width][(Rect.y+dy)%KMap.Height].Value;
			if (!Compare(TestValue,Test))
			{
				return false;
			}
		}
	}
	return true;
}

// Igazat ad vissza, ha minden négyzetre a Ktáblán a .Covered flag be van állítva
//    vagy ha a négyzet értéke "Nem meghatározott"
function IsCovered( Rect )
{
	var dx=0;
	var dy=0;
	for (dx=0; dx<Rect.w; dx++)
	{
		for (dy=0; dy<Rect.h; dy++)
		{
			if (!KMap[(Rect.x+dx)%KMap.Width][(Rect.y+dy)%KMap.Height].Covered)
			{
				//treat dont care's as already covered
				if (!(KMap[(Rect.x+dx)%KMap.Width][(Rect.y+dy)%KMap.Height].Value==DontCare))
				{
					return false;
				}
			}
		}
	}
	return true;
}

// Beállítja a .Covered flag-et a téglalap minden négyzetének a Ktáblán
function Cover( Rect, IsCovered )
{
	var dx=0;
	var dy=0;
	for (dx=0; dx<Rect.w; dx++)
	{
		for (dy=0; dy<Rect.h; dy++)
		{
			KMap[(Rect.x+dx)%KMap.Width][(Rect.y+dy)%KMap.Height].Covered = IsCovered;
		}
	}
}

// Kipróbál minden x,y helyet a Ktáblán, hogy a megadott téglalap érték (w,h) passzol-e oda
//   (értékekben).  Minden helyen, ahol passzol, létrehoz egy téglalapot és hozzáadja a Found
//   tömbhöz.  Ha a DoCover igaz akkor is létrehozza a Ktáblát .Cover flag-et ad minden
//   téglalaphoz, ami passzol.
function SearchRect( w,h, TestValue, Found, DoCover )
{
	if ((w>KMap.Width) || (h>KMap.Height))
	{
		return;  // a téglalap túl nagy
	}

	var x=0;
	var y=0;
	var across = (KMap.Width==w) ?1:KMap.Width;
	var down   = (KMap.Height==h)?1:KMap.Height;
	for (x=0; x<across; x++)
	{
		for (y=0; y<down; y++)
		{
			var Rect = CreateRect(x,y,w,h);
			if (TestRect(Rect,TestValue))
			{
				if (!IsCovered(Rect))
				{
					Found[Found.length]=Rect;
					if (DoCover) Cover(Rect, true);
				}
			}
		}
	}
}

// Végigmegy a téglalapok tömbjén (sorrendben), hogy meghatározza melyikük
//  fed le valamit a Ktáblában és melyikük nem.
//  Hottáadja a téglalapokat, amik lefednek valamit a Used tömbhöz.
function TryRects(Rects,Used)
{
    var j = 0;
    for (j = 0; j < Rects.length; j++)
    {
        var Rect = Rects[j];
        if (TestRect(Rect, true))
        {
            if (!IsCovered(Rect))
            {
                Used[Used.length] = Rect;
                Cover(Rect, true);
            }
        }
    }
}

// Hozzáadja a megadott Weight-et minden elemhez  Weights map-ben a  Rect tömbnek megfelelően.
function AddRectWeight(Weights, Rect, Weight)
{
    var dx = 0;
    var dy = 0;
    for (dx = 0; dx < Rect.w; dx++)
    {
        for (dy = 0; dy < Rect.h; dy++)
        {
            Weights[(Rect.x + dx) % KMap.Width][(Rect.y + dy) % KMap.Height] += Weight;
        }
    }
}

// Összegzi a weight értékét egy téglalapnak azzal, hogy összegzi a weight-ét a téglalap
// minden négyzetének.
function GetRectWeight(Weights, Rect)
{
    var dx = 0;
    var dy = 0;
    var W = 0;
    for (dx = 0; dx < Rect.w; dx++)
    {
        for (dy = 0; dy < Rect.h; dy++)
        {
            W += Weights[(Rect.x + dx) % KMap.Width][(Rect.y + dy) % KMap.Height];
        }
    }
    return W;
}


// A tömbök szétválogatására használjuk a .Weight tag alapján
function SortByWeight(a, b)
{
    if (a.Weight < b.Weight) return -1;
    else if (a.Weight > b.Weight) return 1;
    else return 0;
}

// True-t ad vissza, ha két téglalap fedi egymást
function OverlappingRects(R1,R2)
{
    if ( (R1.x+R1.w>R2.x) &&
         ((R2.x+R2.w)>(R1.x)) &&
         (R1.y+R1.h>R2.y) &&
         ((R2.y+R2.h)>(R1.y))
        )
        return true;
    return false;
}

// Kiválogatja a téglalapok listáját, amik lefednek téglalapokat a Ktáblán és visszaadja a minimális
// részhalmazát ezeknek a téglalapoknak, amik ugyanazokat a négyzeteket fedik le.
function FindBestCoverage(Rects,AllRects)
{
    // Létrehoz egy 'Weight' map-et
    var Weights = new Array();
    for (w = 0; w < KMap.Width; w++)
    {
        Weights[w] = new Array();
        for (h = 0; h < KMap.Height; h++)
        {   // az alap weight 0 ha még nem volt lefedve, magasabb ha már le volt fedve
            Weights[w][h] = (KMap[w][h].Covered)?Heavy:0;
        }
    }
    // Feltölti a weight map-et 1-esekkel azoknál a négyzetnél, amik minden téglalappal le vannak fedve
    var i = 0;
    for (i = 0; i < Rects.length; i++)
    {
        AddRectWeight(Weights, Rects[i], 1);
    }

    // létrehozza a téglalapok weight alapján rendezett sorát, de az után, hogy kiválasztja mindegyik
	//"súlyozott" téglalap minimumát, majd "újrasúlyozza" a map-et a következő kiválasztásához aszerint,
	//hogy a kiválasztott téglalap "súlyát" nagyon nehézre állítja, de csökkenti a súlyát minden négyzetnek,
	//amiket lefed a kiválasztott téglalap. Ez azt okozza, hogy a kettőzött téglalapokat a Ktáblán a lista
	//végére helyezi, miközben előrehozza a lefedett téglalapokat, amik nincsenek átfedésben a kiválasztottal.
    var SortedRects = new Array();
    while (Rects.length>0)
    {
        var j=0;
        for (j = 0; j < Rects.length; j++)
        {   // Lekéri a weight-jét a megmaradt téglalapoknak
            Rects[j].Weight = GetRectWeight(Weights, Rects[j]);
        }
        // Kiválogatja a tömböt, hogy megtalálja a minimum weight-tel rendelkező téglalapot
        Rects.sort(SortByWeight);
        SortedRects.push(Rects[0]);
        if (Rects.length == 1)
        {   // megtaláltuk az utolsó téglalapot, kilépünk
            break;
        }
        // Nagyon "nehézzé" tesszük a weight map-ot a kiválasztott téglalap négyzetének
        AddRectWeight(Weights, Rects[0], Heavy);

        // Csökkentjük a "súlyát" a téglalapoknak, amiket lefed a kiválasztott téglalap
        for (j=0; j< Rects.length; j++)
        {
            if (OverlappingRects(Rects[0], Rects[j]))
            {
                AddRectWeight(Weights, Rects[j], -1);
            }
        }
        // Folytatjuk a téglalapok feldolgozását az elsővel
        Rects = Rects.slice(1);
    }

    // Meghatározzuk, hogy a kiválogatott téglalapok közül melyikre lesz most szükségünk
    TryRects(SortedRects, AllRects);
}

//Megkeressük a minimalizált egyenletét az aktuális Ktáblának.
function Search()
{
    var Rects = new Array();
    Cover(CreateRect(0, 0, KMap.Width, KMap.Height), false);

    //Megtaláljuk a legnagyobb téglalapokat, amik lefedik a négyzeteket a Ktáblán
    //  és keressük a kisebb és kisebb téglalapokat
    SearchRect(4, 4, true, Rects, true);
    SearchRect(4, 2, true, Rects, true);
    SearchRect(2, 4, true, Rects, true);
    SearchRect(1, 4, true, Rects, true);
    SearchRect(4, 1, true, Rects, true);
    SearchRect(2, 2, true, Rects, true);

    // 2x1 méretű téglalapok  - Ezeket speciálisan kell kezelnünk, hogy megtaláljuk a minimalizált megoldást
    var Rects2x1 = new Array();
    SearchRect(2, 1, true, Rects2x1, false);
    SearchRect(1, 2, true, Rects2x1, false);
    FindBestCoverage(Rects2x1, Rects);

    //  hozzáadjuk az 1x1 téglalapokat
    SearchRect(1, 1, true, Rects, true);

    // Ellenőrizzük, hogy a mindenképp szükséges téglalpok nem fednek-e le teljesen egy nagyobb
	// téglalapot (ha igen, akkor a nagyobb feleslegessé válik).
    Cover(CreateRect(0, 0, KMap.Width, KMap.Height), false);
    for (i = Rects.length - 1; i >= 0; i--)
    {
        if (IsCovered(Rects[i]))
        {
            Rects[i] = null;
        }
        else
        {
            Cover(Rects[i], true);
        }
    }

	ClearEquation();
	for (i=0;i<Rects.length; i++)
	{
		if (Rects[i]!=null)
		{
			RectToEquation(Rects[i]);
		}
	}
	if (Equation.UsedLength==0)
	{
		Equation.UsedLength=1;
		Equation[0].Expression="0";
		Equation[0].Rect = CreateRect(0,0,KMap.Width,KMap.Height);
	}
}

function ClearEquation()
{
	for (i=0; i<Equation.length; i++)
	{
		Equation[i].Rect	= null;
	}
	Equation.UsedLength=0;
}

// True-t ad vissza, ha a téglalap teljes egészében benne van egy megadott változóban
function IsConstantVariable( Rect, Variable )
{
	var dx=0;
	var dy=0;
	var topleft = KMap[Rect.x][Rect.y].Variable[Variable];
	for (dx=0; dx<Rect.w; dx++)
	{
		for (dy=0; dy<Rect.h; dy++)
		{
			test = KMap[(Rect.x+dx)%KMap.Width][(Rect.y+dy)%KMap.Height].Variable[Variable];
			if (test!=topleft)
			{
				return false;
			}
		}
	}
	return true;
}

// A téglalapot egy szöveg minterm-mé fordítja (HTM-ben).
function RectToEquation( Rect )
{
	var Text = "";
	var i=0;
	for (i=0; i<VariableCount; i++)
	{
		if (IsConstantVariable( Rect, i))
		{
		//	Text += VariableNames[i];
		//	if (!KMap[Rect.x][Rect.y].Variable[i])
		//	{
		//		Text += "'";
		//	}
			if (!KMap[Rect.x][Rect.y].Variable[i])
			{
				Text += "<span style='text-decoration: overline'>"+VariableNames[i]+"</span> ";
			}
			else
			{
				Text += VariableNames[i] + " ";
			}
		}
	}
	if (Text.length==0)
	{
		Text="1";
	}
	Equation[Equation.UsedLength].Rect  = Rect;
	Equation[Equation.UsedLength].Expression = Text;
	Equation.UsedLength++;

	return Text;
}


// a boolean-t megjeleníthető értékké konvertálja true->"1"  false->"0"
function DisplayValue( bool )
{
	if (bool==true)
	{
		return "1";
	}
	else if (bool==false)
	{
		return "0";
	}
	else return DontCare;
}

// A számot bináris számmá alakítja szövegben (hozzáfűz 0-kat  a 'bitek' hosszához).
function BinaryString( value, bits )
{
	var str = value.toString(2);
	var i=0;
	for (i=0; i<bits; i++)
	{
		if (str.length<bits)
		{
			str = "0" + str;
		}
	}
	return str;
}

// újrarajzolja a UI-t (kiemelések nélkül)
function UpdateUI()
{
    var i = 0;
    for (i = 0; i < TruthTable.length; i++)
    {
        var Val = DisplayValue(TruthTable[i].KMapEntry.Value);
        //Igazság tábla

        SetValue(TruthTable[i].ButtonUIName, Val);
        SetBackgroundColor(TruthTable[i].ButtonUIName, HighlightColor(Val));
        SetBackgroundColor(TruthTable[i].TTROWUIName, HighlightColor(Val));

        //Ktábla
        SetValue(TruthTable[i].KMapEntry.ButtonUIName, Val);
        SetBackgroundColor(TruthTable[i].KMapEntry.ButtonUIName, HighlightColor(Val));
        SetBackgroundColor(TruthTable[i].KMapEntry.TDUIName, HighlightColor(Val));
    }
    SetInnerHTML("EquationDiv", GenerateEquationHTML());
}

function ToggleValue( Value )
{
	if (AllowDontCare)
	{
		if (Value==true)
		{
			return DontCare;
		}
		else if (Value==DontCare)
		{
			return false;
		}
		else if (Value==false)
		{
			return true;
		}
	}
	else
	{
		return !Value;
	}
}

function ToggleTTEntry( TTEntry )
{
	TTEntry.KMapEntry.Value = ToggleValue(TTEntry.KMapEntry.Value);
	RefreshUI();
}

function ToggleKMEntry( KMEntry )
{
	KMEntry.Value = ToggleValue(KMEntry.Value);
	RefreshUI();
}

function RefreshUI()
{
	ClearEquation();
	Search();
	UpdateUI();
}

// újrarajzolja a UI-t a megadott egyenlettel kiemelve
function SetShowRect( EquationEntry, EquationIndex )
{
	if (EquationEntry==null)
	{
		UpdateUI();
		return;
	}
	else
	{
	    var ShowRect = EquationEntry.Rect;

	    var dx = 0;
        var dy = 0;
        for (dx = 0; dx < ShowRect.w; dx++)
        {
            for (dy = 0; dy < ShowRect.h; dy++)
            {
                var KMEntry = KMap[(ShowRect.x + dx) % KMap.Width][(ShowRect.y + dy) % KMap.Height];
                var Val = DisplayValue(TruthTable[i].KMapEntry.Value);
                //Ktábla
                SetBackgroundColor(KMEntry.ButtonUIName, RectHighlightColor(Val));
                SetBackgroundColor(KMEntry.TDUIName, RectHighlightColor(Val));
                //Igazság tábla
                SetBackgroundColor(KMEntry.TruthTableEntry.ButtonUIName, RectHighlightColor(Val));
                SetBackgroundColor(KMEntry.TruthTableEntry.TTROWUIName, RectHighlightColor(Val));
            }
        }
	}
	SetBackgroundColor(Equation[EquationIndex].ButtonUIName,EquationHighlightColor);
}

function GetElement(Name)
{
	if (document.getElementById)
	{
		return document.getElementById(Name);
	}
	else if (document.all)
	{
		return document.all[Name];
	}
	else if (document.layers)
	{
		return document.layers[Name]
	}
}

function SetInnerHTML(Name,Text)
{
	GetElement(Name).innerHTML = Text
}

function SetBackgroundColor(Name,Color)
{
	GetElement(Name).style.backgroundColor = Color;
}

function SetValue(Name,Value)
{
	GetElement(Name).value = Value;
}

function GenerateTruthTableHTML()
{
	var Text = "<table ID=\"TruthTableID\" style=\"text-align:center\">";
	{
		Text = Text + "<thead style=\"background: rgb(49,60,78);text-align:center\"><tr>";
		var i=0;
		for (i=0; i<VariableCount; i++)
		{
			Text = Text + "<th>"+VariableNames[i]+"</th>";
		}
		Text = Text + "<th>"+FunctionText+"</th></tr></thead>";

		for (i=0; i<TruthTable.length; i++)
		{
			if (i % 2 == 0)
			{
				var count = 0.85;
			}else{
				var count = 0.8;
			}

			Text += "<tr ID='"+TruthTable[i].TTROWUIName+"' style=\"opacity: " +count+ "\">";
			var j=0;
			for (j=0; j<VariableCount; j++)
			{
				if (DisplayValue(TruthTable[i][j].Variable) == 1) {
					var color = "style=\"background-color: rgba(255,255,255,.3);font-weight: bold\""
				}else{
					var color = "";
				}

				Text = Text + "<td " + color + ">"+ DisplayValue(TruthTable[i][j].Variable)+"</td>";
			}
			Text = Text
				+ "<td><input class=\"remove-bottom full-width\" ID=\""+TruthTable[i].ButtonUIName +"\" name="+TruthTable[i].ButtonUIName +" type='button' value='"+DisplayValue(TruthTable[i].KMapEntry.Value)+"' onClick=\"ToggleTTEntry(TruthTable["+i+"])\" ></td>"
				+ "</tr>";
		}
	}
	Text = Text + "</table>";
	return Text;
}

function GenerateKarnoMapHTML()
{
	var Text = "<table><thead><tr>";
	var h,w;
	Text = Text + "<th colspan=\"2\" ></th><th style=\"background: rgb(49,60,78);border-bottom:2px solid rgb(31, 39, 55)\" colspan="+(KMap.Width)+">";

	for (i=0; i<KMap.XVariables; i++)
	{
		Text += VariableNames[i];
	}

	Text += "</th></tr></thead>";
	Text += "<tbody><tr>";
	Text += "<th ></th><th style=\"border-left: none !important\"></th>";

	for (i=0; i<KMap.Width; i++)
	{
		Text += "<th class=\"header-color\" style=\"background: rgb(49,60,78)\">"+BinaryString(BitOrder[i],KMap.XVariables)+"</th>";
	}
	Text+="</tr>";

	for (h=0; h<KMap.Height; h++)
	{
		if (h % 2 != 0)
		{
			var count = 0.85;
		}else{
			var count = 0.8;
		}
		Text = Text + "<tr style=\"opacity:" +count + "\">";
		if (h==0)
		{
			Text += "<th style=\"background: rgb(49,60,78); width: 15%\" rowspan="+((KMap.Height) + 2)  +">";
			for (i=0; i<KMap.YVariables; i++)
			{
				Text += "<b class=\"header-color\">" + VariableNames[i+KMap.XVariables] + "</b>";
			}
		}
		Text += "<th class=\"header-color\" style=\"border-left: 2px solid rgb(31, 39, 55);background: rgb(49,60,78);width: 15%\" >"+BinaryString(BitOrder[h],KMap.YVariables)+"</th>";

		for (w=0; w<KMap.Width; w++)
		{

			Text += "<td  ID='"+KMap[w][h].TDUIName+"' style='text-align:center;'>"
					+ "<input class=\"remove-bottom full-width\" ID="+KMap[w][h].ButtonUIName +" name="+KMap[w][h].ButtonUIName +" type='button'  value='"+DisplayValue(KMap[w][h].Value)+"' onClick=\"ToggleKMEntry(KMap["+w+"]["+h+"])\">"
					+ "</td>";
		}
		Text += "</tr>";
	}
	Text +="</td></tr></tbody></table>";
	return Text;
}


function GenerateEquationHTML()
{
	var j;
	var i;
	for (i=0; i<Equation.UsedLength; )
	{
		var Text = "<p class=\"header-color remove-bottom\">";
		for (j=0; (j < 8) && (i<Equation.UsedLength); j++)
		{
			if (i==0) Text+= "<b>"+FunctionText + " = ";
			Text += "<span class=\"blue button half-bottom\" id=\""+Equation[i].ButtonUIName + "\" onMouseOver=\"SetShowRect(Equation["+i+"],"+i+");\" onMouseOut=\"SetShowRect(null);\" style=\"padding:5px\">";
			Text += "<b>" + Equation[i].Expression + "</span>";
			if (i<Equation.UsedLength-1) Text +=" <span> + </span>";
			i++;
		}
		Text += "</p>"
	}
	return Text;
}

function ChangeVariableNumber( Num )
{
	InitializeTables(Num);
	ClearEquation();
	SetInnerHTML("TruthTableDiv",GenerateTruthTableHTML());
	SetInnerHTML("KarnoMapDiv",GenerateKarnoMapHTML());
	SetInnerHTML("EquationDiv",GenerateEquationHTML());
	GetElement("FourVariableRB").checked  = (Num==4)?true:false;
	Search();
	UpdateUI();
}

function ToggleDontCare()
{
	AllowDontCare=!AllowDontCare;
	var i=0;
	for (i=0;i<TruthTable.length; i++)
	{
		if (TruthTable[i].KMapEntry.Value==DontCare)
		{
			TruthTable[i].KMapEntry.Value=false;
		}
	}
	ChangeVariableNumber(VariableCount);
	GetElement("AllowDontCareCB").checked = AllowDontCare;
}

function PageParameter( Name )
{
	var Regex = new RegExp( "[\\?&]"+Name+"=([^&#]*)" );
	var Results = Regex.exec( window.location.href );
	if( Results != null )
	{
		return Results[1];
	}
	return "";
}
