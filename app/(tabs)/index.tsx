import React, { useEffect, useMemo, useState } from 'react';
import MapView, { Geojson, Marker } from 'react-native-maps';
import { StyleSheet, View } from 'react-native';

import * as Location from 'expo-location';

export interface Radar {
  id: number,
  lat: number,
  lng: number,
  type: string,
}

const dataJSON: any = {
  type: "FeatureCollection",
  features: [
    { type: "Feature", geometry: { type: "Polygon", coordinates: [[[5.6671652, 45.2576193], [5.6675323, 45.2570522], [5.6677421, 45.2570367], [5.6677065, 45.2572749], [5.6677736, 45.2572869], [5.6678371, 45.2572984], [5.6680458, 45.257336], [5.6683722, 45.2574403], [5.6683352, 45.2575026], [5.6683087, 45.2575476], [5.6682521, 45.257643], [5.6681301, 45.2576044], [5.6680818, 45.2576796], [5.6680363, 45.2577505], [5.6679618, 45.2577372], [5.6678979, 45.2577259], [5.6678585, 45.2577188], [5.6678427, 45.257754], [5.6677949, 45.2577481], [5.6678012, 45.2577183], [5.667696, 45.2577024], [5.6676403, 45.2576937], [5.6671652, 45.2576193]]] }, properties: { created: "2011-03-24", updated: "2014-02-26" } },
    { type: "Feature", geometry: { type: "Polygon", coordinates: [[[5.6502826, 45.257678], [5.6505005, 45.256922], [5.6506599, 45.2563564], [5.6510689, 45.2563943], [5.6509686, 45.2568592], [5.6508754, 45.2572849], [5.6508125, 45.2575733], [5.650753, 45.257841], [5.6504724, 45.2578027], [5.6504931, 45.2577272], [5.6503582, 45.2576956], [5.6502826, 45.257678]]] }, properties: { parcelle: "38170000AA0018", lettre: "a", created: "2004-04-06", updated: "2017-06-13" } },
    { type: "Feature", geometry: { type: "Polygon", coordinates: [[[5.6506543, 45.2579221], [5.6505736, 45.2579176], [5.6505025, 45.2579116], [5.6503573, 45.2578945], [5.6502265, 45.2578758], [5.6502826, 45.257678], [5.6503582, 45.2576956], [5.6504931, 45.2577272], [5.6504724, 45.2578027], [5.650753, 45.257841], [5.650735, 45.2579224], [5.6507076, 45.2579228], [5.6506543, 45.2579221]]] }, properties: { parcelle: "38170000AA0018", created: "2004-04-06", updated: "2017-06-13" } },
    { type: "Feature", geometry: { type: "Polygon", coordinates: [[[5.6473243, 45.2527542], [5.6475483, 45.2526635], [5.6478867, 45.2525193], [5.6479605, 45.2524884], [5.64781, 45.2525998], [5.6475796, 45.2527732], [5.6473345, 45.2529584], [5.6470434, 45.2531754], [5.6467812, 45.25337], [5.646548, 45.2535455], [5.6463355, 45.2537013], [5.6461037, 45.2538735], [5.6458984, 45.2540291], [5.6456843, 45.2541897], [5.6454858, 45.2543306], [5.6452662, 45.2544769], [5.6450267, 45.2546401], [5.644809, 45.2547877], [5.6446129, 45.2549233], [5.6444897, 45.2550001], [5.6443524, 45.2550865], [5.6443032, 45.2551145], [5.6441533, 45.2552093], [5.6439588, 45.2553259], [5.643826, 45.2554021], [5.6436888, 45.2554769], [5.6436392, 45.2555084], [5.6433876, 45.2556394], [5.6432054, 45.255735], [5.6430999, 45.255791], [5.6430962, 45.2557928], [5.6430961, 45.2557928], [5.6429376, 45.2557443], [5.642819, 45.2557078], [5.6429147, 45.2556578], [5.6431736, 45.2555215], [5.6434936, 45.2553468], [5.64371, 45.2552218], [5.6438553, 45.2551378], [5.6440909, 45.2550031], [5.6443229, 45.2548787], [5.6445866, 45.2546997], [5.6447998, 45.2545591], [5.6448394, 45.2545368], [5.6449299, 45.2544938], [5.6450565, 45.2544389], [5.6450902, 45.2544175], [5.6452515, 45.2542961], [5.6459699, 45.2537579], [5.6467116, 45.2532075], [5.6473243, 45.2527542]]] }, properties: { parcelle: "38170000AB0026", lettre: "c", created: "2004-04-06", updated: "2014-02-26" } },
    { type: "Feature", geometry: { type: "Polygon", coordinates: [[[5.6430999, 45.255791], [5.6432054, 45.255735], [5.6433876, 45.2556394], [5.6436392, 45.2555084], [5.6436888, 45.2554769], [5.643826, 45.2554021], [5.6439588, 45.2553259], [5.6441533, 45.2552093], [5.6443032, 45.2551145], [5.6443524, 45.2550865], [5.6444897, 45.2550001], [5.6446129, 45.2549233], [5.644809, 45.2547877], [5.6450267, 45.2546401], [5.6452662, 45.2544769], [5.6454858, 45.2543306], [5.6456843, 45.2541897], [5.6458984, 45.2540291], [5.6461037, 45.2538735], [5.6463355, 45.2537013], [5.646548, 45.2535455], [5.6467812, 45.25337], [5.6470434, 45.2531754], [5.6473345, 45.2529584], [5.6475796, 45.2527732], [5.64781, 45.2525998], [5.6479605, 45.2524884], [5.6480374, 45.2524562], [5.6480926, 45.2524331], [5.6481242, 45.2524198], [5.6481617, 45.2524043], [5.648084, 45.2524647], [5.6479335, 45.2525842], [5.6478519, 45.2526509], [5.6478087, 45.252686], [5.6474998, 45.2529243], [5.6473154, 45.2530601], [5.6471552, 45.253171], [5.6469823, 45.2533058], [5.6468925, 45.2533825], [5.6468696, 45.2533939], [5.6468377, 45.2534029], [5.6468288, 45.2534113], [5.6467973, 45.2534335], [5.6467891, 45.2534399], [5.6467746, 45.2534513], [5.6466718, 45.2535319], [5.6465319, 45.2536378], [5.6463524, 45.2537652], [5.6461388, 45.253915], [5.6458847, 45.254103], [5.6457503, 45.2542039], [5.6455979, 45.2543149], [5.6455138, 45.2543751], [5.6454012, 45.2544507], [5.6453563, 45.2544885], [5.6453091, 45.2545264], [5.6452417, 45.2545683], [5.6449661, 45.2547594], [5.644705, 45.2549349], [5.6444946, 45.2550705], [5.6444159, 45.2551213], [5.6443753, 45.255149], [5.644364, 45.2551565], [5.6443405, 45.2551725], [5.6442237, 45.2552383], [5.6440976, 45.2553093], [5.6439449, 45.2553949], [5.6438105, 45.2554762], [5.6436953, 45.255541], [5.6435599, 45.2556184], [5.6434404, 45.2556847], [5.6433073, 45.2557519], [5.6431841, 45.2558162], [5.6431797, 45.2558184], [5.6431362, 45.2558052], [5.6431251, 45.2558018], [5.6430962, 45.2557928], [5.6430999, 45.255791]]] }, properties: { parcelle: "38170000AB0026", lettre: "b", created: "2004-04-06", updated: "2014-02-26" } },
    { type: "Feature", geometry: { type: "Polygon", coordinates: [[[5.6493454, 45.2519096], [5.6492436, 45.2519874], [5.6488452, 45.2522871], [5.6484554, 45.2525771], [5.6480727, 45.2528665], [5.6477813, 45.2530872], [5.6473954, 45.2533711], [5.6470095, 45.2536522], [5.6466189, 45.2539278], [5.646317, 45.2541358], [5.6460092, 45.2543414], [5.6457038, 45.2545466], [5.645287, 45.2548244], [5.6450498, 45.2549752], [5.6448614, 45.2550889], [5.6446621, 45.2552082], [5.6446217, 45.2552311], [5.6446102, 45.2552376], [5.6445173, 45.2552905], [5.6442096, 45.2554653], [5.6439504, 45.2556076], [5.6437692, 45.2557058], [5.6434524, 45.2558712], [5.6434175, 45.2558907], [5.6433103, 45.2558585], [5.6431801, 45.2558186], [5.6431797, 45.2558184], [5.6431841, 45.2558162], [5.6433073, 45.2557519], [5.6434404, 45.2556847], [5.6435599, 45.2556184], [5.6436953, 45.255541], [5.6438105, 45.2554762], [5.6439449, 45.2553949], [5.6440976, 45.2553093], [5.6442237, 45.2552383], [5.6443405, 45.2551725], [5.644364, 45.2551565], [5.6443753, 45.255149], [5.6444159, 45.2551213], [5.6444946, 45.2550705], [5.644705, 45.2549349], [5.6449661, 45.2547594], [5.6452417, 45.2545683], [5.6453091, 45.2545264], [5.6453563, 45.2544885], [5.6454012, 45.2544507], [5.6455138, 45.2543751], [5.6455979, 45.2543149], [5.6457503, 45.2542039], [5.6458847, 45.254103], [5.6461388, 45.253915], [5.6463524, 45.2537652], [5.6465319, 45.2536378], [5.6466718, 45.2535319], [5.6467746, 45.2534513], [5.6467891, 45.2534399], [5.6467973, 45.2534335], [5.6468288, 45.2534113], [5.6468377, 45.2534029], [5.6468696, 45.2533939], [5.6468925, 45.2533825], [5.6469823, 45.2533058], [5.6471552, 45.253171], [5.6473154, 45.2530601], [5.6474998, 45.2529243], [5.6478087, 45.252686], [5.6478519, 45.2526509], [5.6479335, 45.2525842], [5.648084, 45.2524647], [5.6481617, 45.2524043], [5.6485617, 45.2522391], [5.6490378, 45.2520383], [5.6493454, 45.2519096]]] }, properties: { parcelle: "38170000AB0026", lettre: "a", created: "2004-04-06", updated: "2014-02-26" } },
  ]
}

const EARTH_RADIUS_KM = 6371; // Rayon de la Terre en kilomètres
// // Fonction pour calculer la distance entre deux points géographiques
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_KM * c; // Distance en kilomètres
};

export default function App() {
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [radars, setRadars] = useState<Radar[]>([]);
  const [loadedPos, setLoadedPos] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [loadedNearby, setLoadedNearby] = useState(false);
  // const [nearbyRadars, setNearbyRadars] = useState<Radar[]>([]);



  useEffect(() => {
    (async () => {

      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Permission to access location was denied');
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      setLocation(location);
      setLoadedPos(true)
    })()
  }, []);


  const fetchLocations = async () => {
    const response = await fetch(
      'https://radars.securite-routiere.gouv.fr/radars/all'
    );
    const data = await response.json();
    const radars = data.map((d: any) => ({
      lat: d.lat,
      lng: d.lng,
      type: d.type,
      id: d.id
    }))
    console.log('data : ', JSON.stringify(radars[10], null, 2), radars.length)
    console.log('radars:',JSON.stringify(radars, null, 2))
    setRadars(radars)
    setLoaded(true)
  };

  useEffect(() => {
    fetchLocations();
  }, []);

  // useEffect(() => {
  //   if (location) {
  //     const userLat = location.coords.latitude; // changer pour tester
  //     const userLon = location.coords.longitude; // changer pour tester

  //     console.log("co : ", userLat, userLon)

  //     // Filtrer les radars à proximité de l'utilisateur (par exemple, à moins de 10 km)
  //     const nearby = radars.filter(radar => {
  //       const distance = calculateDistance(userLat, userLon, radar.lat, radar.lng);
  //       return distance <= 75; // Modifier cette valeur pour ajuster le rayon de recherche (en km)
  //     });
  //     console.log("nearby: ",nearby)
  //     setNearbyRadars(nearby);
  //     setLoadedNearby(true);
  //   }
  // }, [location, radars]); // Recalculer les radars à proximité chaque fois que la position ou la liste des radars change

  // Calculer les radars proches avec useMemo
  const nearbyRadars = useMemo(() => {
    if (!location) return [];
      const userLat = location.coords.latitude;
      const userLon = location.coords.longitude;

    const nearby = radars.filter((radar) => {
      const distance = calculateDistance(userLat, userLon, radar.lat, radar.lng);
      return distance <= 75; 
    });

    // console.log('Nearby radars:', nearby);
    setLoadedNearby(true);
    return nearby;

  }, [location, radars]);

  return (
    <View style={styles.container}>
      {loadedPos && <MapView
        rotateEnabled={false}
        style={styles.map}
        initialRegion={{
          latitude: location?.coords.latitude || 45,
          longitude: location?.coords.longitude || 5,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        }}
        // onRegionChangeComplete={(region => setRegion(region))}
      >
        {/* <Geojson
          geojson={dataJSON}
          strokeColor="red"
          fillColor="green"
          strokeWidth={2}
        />  */}
        {loaded && loadedNearby && 
          nearbyRadars.map((radar) => (
            <Marker
              key={radar.id}
              coordinate={{ latitude: radar.lat, longitude: radar.lng }}
              title={radar.type}
            />
          ))
        }
        
      </MapView>}
      
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    width: '100%',
    height: '100%',
  },
});

