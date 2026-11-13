// nieuw-V4R6 — plaatsnamen die banken achter een bedrijfsnaam zetten ("Jumbo Utrecht", "Action Boxtel", "Decathlon Best").
// Alleen gebruikt om de plaats aan het EIND van een naam weg te laten bij de sleutel van de gedeelde namenlijst (bedrijfSleutel).
// Kleine letters, zonder accenten; meerdelige namen met spaties.
export const PLAATSEN = new Set(`
aalsmeer aalten alkmaar almelo almere alphen amersfoort amstelveen amsterdam apeldoorn appingedam arnhem assen asten
baarle baarn barendrecht barneveld beek beesel bergeijk bergen best beuningen beverwijk bladel blaricum bodegraven borne borsele
boxmeer boxtel breda brielle bronckhorst brummen brunssum bunnik bunschoten bussum capelle castricum coevorden cranendonck cuijk
culemborg dalfsen dalen deurne delft delfzijl deventer diemen dinkelland doetinchem dokkum dongen dordrecht drachten driebergen
dronten druten duiven edam ede eemnes eersel eindhoven elburg emmeloord emmen enkhuizen enschede epe ermelo etten geldrop
geldermalsen geleen gemert gendt gennep goes goirle gorinchem gouda groesbeek groningen gulpen haaksbergen haaren haarlem
haarlemmermeer halderberge hardenberg harderwijk harlingen hattem heemskerk heemstede heerde heerenveen heerhugowaard heerlen
heesch heeze helden hellendoorn hellevoetsluis helmond hengelo heumen heusden hillegom hilvarenbeek hilversum hoofddorp hoogeveen
hoorn horst houten huizen hulst ijsselstein joure kaatsheuvel kampen kapelle katwijk kerkrade klundert krimpen laarbeek landgraaf
landsmeer langedijk laren leerdam leeuwarden leiden leiderdorp leidschendam lelystad leusden lichtenvoorde lingewaard lisse
lochem losser maarssen maassluis maastricht medemblik meerssen meppel middelburg middelharnis mierlo mijdrecht moerdijk
montfoort naaldwijk naarden nederweert nieuwegein nijkerk nijmegen nijverdal noordwijk nuenen nunspeet oegstgeest oirschot
oisterwijk oldenzaal olst ommen oosterhout oostzaan oss oudewater oudenbosch papendrecht pijnacker purmerend putten raalte
reeuwijk renkum rheden rhenen ridderkerk rijssen rijswijk roermond roosendaal rosmalen rotterdam rucphen schagen scheveningen
schiedam schijndel schinnen sittard sliedrecht sneek soest someren son spijkenisse stadskanaal staphorst steenbergen steenwijk
susteren terneuzen texel tholen tiel tilburg tubbergen twello uden uithoorn urk utrecht vaals valkenburg valkenswaard veendam
veenendaal veghel veldhoven velp venlo venray vianen vlaardingen vlissingen vlijmen voorburg voorhout voorschoten voorst vught
waalre waalwijk waddinxveen wageningen wassenaar weert weesp werkendam westland wierden wijchen winschoten winsum winterswijk
woensdrecht woerden wormerveer zaandam zaltbommel zandvoort zeewolde zeist zevenaar zoetermeer zundert zutphen zwijndrecht zwolle
antwerpen brussel bruxelles gent brugge leuven hasselt genk mechelen turnhout lier aken aachen kleve duesseldorf dusseldorf
koeln koln keulen essen duisburg emmerich venlo-blerick blerick
`.trim().split(/\s+/).concat(["den haag", "den bosch", "den helder", "bergen op zoom", "alphen aan den rijn", "capelle aan den ijssel",
  "krimpen aan den ijssel", "etten leur", "hendrik ido ambacht", "sint michielsgestel", "sint oedenrode", "wijk bij duurstede",
  "gilze en rijen", "s hertogenbosch", "hertogenbosch", "nieuw vennep", "de bilt", "de meern", "het gooi"]));
