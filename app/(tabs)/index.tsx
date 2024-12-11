import React, { useEffect, useMemo, useState } from 'react';
import MapView, { Circle, Geojson, Marker } from 'react-native-maps';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Location from 'expo-location';
import * as Permissions from "expo-permissions";
import Modal from "react-native-modal";
import { SafeAreaView } from 'react-native-safe-area-context';

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



const API_URL = 'http://localhost:1338/api'; // Remplacez par l'URL de votre serveur Strapi

const createRadarZoneTime = async (newData: any) => {
  try {
    const response = await fetch(`${API_URL}/radar-zone-times`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ data: newData }), // Strapi attend les données dans une clé "data"
    });
    if (!response.ok) {
      throw new Error(`Erreur HTTP : ${response.status}`);
    }
    const data = await response.json();
    return data.data;
  } catch (error) {
    console.error('Erreur lors de la création d\'une entrée :', error);
    throw error;
  }
};





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
  const [isLogged, setIsLogged] = useState(false);
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isCo, setIsCo] = useState(false)

  const [debut, setDebut] = useState<Date | null>(null)
  const [fin, setFin] = useState<Date | null>(null)
  const [seconds, setSeconds] = useState<Number | null>(null);



  const co = async (data: any) => {
    fetch("https://c51d-37-64-102-102.ngrok-free.app/api/auth/local/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: data
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Erreur HTTP : ${response.status}`);
        }
        return response.json();
      })
      .then((data) => {
        console.log("User profile", data.user);
        console.log("User token", data.jwt);
      })
      .catch((error) => {
        console.error("Co ; An error occurred:", error.message);
      });

  }

  const startTimer = () => {
    setDebut(new Date()); // Enregistrez la date et l'heure de début
    setSeconds(null); // Réinitialisez le temps écoulé lors du redémarrage
  };

  const stopTimer = () => {
    if (debut) {
      const currentTime = new Date();
      setFin(currentTime); // Enregistrez la date et l'heure de fin

      // Calculez la différence en secondes
      const timeDifference = Math.floor((currentTime.getTime() - debut.getTime()) / 1000);
      setSeconds(timeDifference);
    }
  };


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

  useEffect(() => {
    const requestPermissions = async () => {
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
  }, [])

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
    if (!location || !nearbyRadars) return [];

    // const userLat = location.coords.latitude;
    // const userLon = location.coords.longitude;
    let dist;
    nearbyRadars?.forEach((nearbyRadar) => {
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
        // start timer
        startTimer()


      } else if (isControled == true && !(dist <= radarRadius)) {
        Notifications.scheduleNotificationAsync({
          content: {
            title: "Fin de la zone de controle 😎",
            body: `Vous avez quitté la zone du radar ${nearbyRadar.id}.`,
            sound: true,
          },
          trigger: null, // Immédiat
        });
        // on stop le timer 
        stopTimer()
        // on envoie la donné
        const temps = '' + seconds
        createRadarZoneTime({ Time_spent: temps})
          .then(data => console.log('Entrée créée :', data));

      }
    })
    if (dist == undefined) return []
    return dist <= radarRadius && dist != 0
  }), [location]);

  const handleRegToLog = () => {
    setIsCo(true)

  };

  const handleCo = () => {
      const data =  JSON.stringify(
        {
          username: username,
          email: email,
          password: password
        }
      )
      co(data)
      setIsLogged(true)
  };

  const handleLogToReg = () => {
    setIsCo(false)
    
  };


  return (
    <View style={styles.container}>
      {!isLogged && !isCo && <SafeAreaView style={styles.formcont}>
        <Text style={styles.text}>Sign up</Text>
        <TextInput
          style={styles.input}
          placeholder="Username"
          value={username}
          onChangeText={setUsername}
        />
        <TextInput
          style={styles.input}
          placeholder="Email"
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={styles.input}
          placeholder="Mot de passe"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
        <TouchableOpacity style={styles.button} onPress={handleRegToLog}>
          <Text style={styles.buttonText}>{"Switch to login"}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={handleCo}>
          <Text style={styles.buttonText}>{"Valider"}</Text>
        </TouchableOpacity>

      </SafeAreaView>

      }
      {!isLogged && isCo && 
      <SafeAreaView style={styles.formcont}>
        <Text style={styles.text}>Log in</Text>
        <TextInput
          style={styles.input}
          placeholder="Username"
          value={username}
          onChangeText={setUsername}
        />
        <TextInput
          style={styles.input}
          placeholder="Mot de passe"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
        <TouchableOpacity style={styles.button} onPress={handleLogToReg}>
          <Text style={styles.buttonText}>{"Switch to reg"}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={handleCo}>
          <Text style={styles.buttonText}>{"Valider"}</Text>
        </TouchableOpacity>

      </SafeAreaView>}
      {isLogged && loadedPos &&
        <MapView
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
  text: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#fff'
  },
  container: {
    flex: 1,
  },
  formcont: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  input: {
    width: '100%',
    padding: 12,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    marginBottom: 16,
    backgroundColor: '#fff',
  },
  button: {
    backgroundColor: '#6200ee',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderWidth: 2,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});

