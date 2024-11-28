import React, { useEffect, useMemo, useState } from 'react';
import MapView, { Circle, Geojson, Marker } from 'react-native-maps';
import { Alert, StyleSheet, View } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Location from 'expo-location';
import * as Permissions from "expo-permissions";

export interface Radar {
  id: number,
  lat: number,
  lng: number,
  type: string,
}

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});



const EARTH_RADIUS_KM = 6371; // Rayon de la Terre en kilomètres

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = EARTH_RADIUS_KM * 1000; // Rayon de la Terre en mètres
  const toRad = (value: number) => (value * Math.PI) / 180; // Convertit degrés en radians

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance en mètres
}

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
  const [region, setRegion] = useState({
    latitude: location?.coords.latitude || 45,
    longitude: location?.coords.longitude || 5,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });
  const radarRadius = 500;

  // on recup la position a l'init
  useEffect(() => {
    (async () => {

      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Permission to access location was denied');
        return;
      }

      let location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
        timeInterval: 300,
        distanceInterval: 0.5,
      });
      setLocation(location);
      setLoadedPos(true)
    })()
  }, []);

  useEffect(()=>{
    const requestPermissions = async()=>{
      const { status: notificationStatus } =
        await Notifications.requestPermissionsAsync();
        if (notificationStatus !== "granted") {
          Alert.alert(
            "Permissions requises",
            "Veuillez autoriser les notifications."
          );
        }
    }
    requestPermissions();
  },[])

  // update pos
  useEffect(() => {
    (async () => {
      await Location.watchPositionAsync({
        accuracy: Location.Accuracy.High,
        timeInterval: 3000,
        distanceInterval: 1,
      }, (newLocation) => {
        console.log('new location : ', newLocation)
        setLocation(newLocation);
      });
    })()
  }, [])

  // fetch api radar
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
    // console.log('data : ', JSON.stringify(radars[10], null, 2), radars.length)
    // console.log('radars:',JSON.stringify(radars, null, 2))
    setRadars(radars)
    setLoaded(true)
  };

  // liste des radar a l'init
  useEffect(() => {
    fetchLocations();
  }, []);

  // Calculer les radars proches avec useMemo
  const nearbyRadars = useMemo(() => {
    if (!location) return [];
    const userLat = location.coords.latitude;
    const userLon = location.coords.longitude;

    const nearby = radars.filter((radar) => {
      const distance = calculateDistance(userLat, userLon, radar.lat, radar.lng);
      return distance <= 75;
    });

    const regionPos = radars.filter((radar) => {
      const distance = calculateDistance(region.latitude, region.longitude, radar.lat, radar.lng);
      return distance <= 75;
    });

    const fusion = radars.filter((radar) => {
      return nearby.includes(radar) || regionPos.includes(radar);
    })
    // console.log('fusion radars:', fusion);
    setLoadedNearby(true);
    return fusion;

  }, [location, radars, region]);

  // log pour region update
  useEffect(() => {
    console.log("region: ", region)
  }, [region])

  // bool pour indiquer si on est dans une zone radar (update en fonction de location)
  const isControled = useMemo((() => {
    if(!location || !nearbyRadars) return [];

    const userLat = location.coords.latitude;
    const userLon = location.coords.longitude;
    let dist;
    nearbyRadars?.forEach((nearbyRadar)=>{
        dist = haversineDistance(
        location.coords.latitude,
        location.coords.longitude,
        nearbyRadar.lat,
        nearbyRadar.lng
      );
      
      if (dist <= radarRadius) {
        Notifications.scheduleNotificationAsync({
          content: {
            title: "Attention Radar 🚨",
            body: `Vous êtes dans la zone du radar ${nearbyRadar.id}.`,
            sound: true,
          },
          trigger: null, // Immédiat
        });
      }else if (isControled == true && !(dist <= radarRadius) ){
        Notifications.scheduleNotificationAsync({
          content: {
            title: "Fin de la zone de controle 😎",
            body: `Vous avez quitté la zone du radar ${nearbyRadar.id}.`,
            sound: true,
          },
          trigger: null, // Immédiat
        });
      }
    })
    if (dist == undefined) return []
    return dist <= radarRadius && dist != 0 
  }),[location]);




  return (
    <View style={styles.container}>
      {loadedPos && <MapView
        rotateEnabled={false}
        zoomEnabled={false}
        style={styles.map}
        initialRegion={{
          latitude: location?.coords.latitude || 45,
          longitude: location?.coords.longitude || 5,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        }}
        onRegionChangeComplete={(region => setRegion(region))}
      >
        {loaded && loadedNearby &&
          nearbyRadars.map((radar) => (

            <React.Fragment key={radar.id}>
              <Marker
                coordinate={{ latitude: radar.lat, longitude: radar.lng }}
                title={radar.type} />
              <Circle
                center={{
                  latitude: radar.lat,
                  longitude: radar.lng
                }}
                fillColor={'blue'}
                radius={500}>
              </Circle>
            </React.Fragment>


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

