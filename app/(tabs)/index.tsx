import React, { useEffect, useMemo, useState } from 'react';
import MapView, { Circle, Geojson, Marker } from 'react-native-maps';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Location from 'expo-location';
import * as Permissions from "expo-permissions";
import Modal from "react-native-modal";
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Link, Stack } from 'expo-router';

export interface Radar {
  id: number,
  lat: number,
  lng: number,
  type: string,
}

export interface IApiRecords{
  data: {Time_spent: number}[]
  
}

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});




const API_URL = 'https://c51d-37-64-102-102.ngrok-free.app/api/'; // Remplacez par l'URL de votre serveur Strapi

const createRadarZoneTime = async (newData: any) => {
  const token = await AsyncStorage.getItem('token');
  if (!token) {
    Alert.alert('Erreur', 'Vous devez être connecté pour soumettre des données.');
    return;
  }
  console.log('before send', token, newData)
  try {
    const response = await fetch(`${API_URL}radar-zone-times`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        data: {
          id_radar: newData["id_radar"],
          Time_spent: newData["Time_spent"]

          // Time_spent: newData["Time_spent"].toString()
        }
      }), // Strapi attend les données dans une clé "data"
    });
    if (!response.ok) {
      console.log('response', JSON.stringify(response, null, 2))
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


// const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6OCwiaWF0IjoxNzMzOTIxNTg0LCJleHAiOjE3MzY1MTM1ODR9.Tz4Q6xlhGlr-U8fMOKjRsvckEwiYy0qvUz7ZwK902ws' // B, B

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

  const [modalVisible, setModalVisible] = useState(false);
  const [records, setRecords] = useState<Number[]>([]);

  // const credentials = btoa(`${username}:${password}`)

  const co = async (data: any) => {
    fetch(`${API_URL}auth/local/register`, {
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
    // Stocker le token dans AsyncStorage
    await AsyncStorage.setItem('token', data.jwt);
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
      const timeDifference = ((currentTime.getTime() - debut.getTime()) / 1000).toFixed(2);
      console.log(timeDifference);
      setSeconds(Number(timeDifference));
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
        // console.log('new location : ', newLocation)
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
    // console.log("region: ", region)
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
        createRadarZoneTime({
          Time_spent: seconds,
          id_radar: nearbyRadar.id
        })
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
    const data = JSON.stringify(
      {
        username: username,
        email: email,
        password: password
      }
    )
    co(data)
    setIsLogged(true)
  };

  const log = async () => {

    const response = await fetch(`${API_URL}auth/local`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json', // Type de contenu JSON
      },
      body: JSON.stringify({
        identifier: username,
        password
      })
    });
    const data = await response.json()
    // Stocker le token dans AsyncStorage
    await AsyncStorage.setItem('token', data.jwt);
  }

  const checkUserOn = async () => {
    const token = await AsyncStorage.getItem('token');
    await fetch(`${API_URL}users/me`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json', // Type de contenu JSON
      }
    });
    console.log("test est connecté")
  }


  const handleLog = () => {
    log()
    setIsLogged(true)
  }

  const handleLogToReg = () => {
    setIsCo(false)
  };

  useEffect(() => { console.log('logged ? : ', isLogged) }, [isLogged])

  // const formatTime = (time: any) => {
  //   if (time === null) return '00:00';

  //   const minutes = Math.floor(time / 60);
  //   const seconds = time % 60;
  //   return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  // };

  const handlePress = (id: number) => {
    Alert.alert("Information",
      `Vous avez appuyé sur le marker : ${id}`, [
      {
        text: "OK",
        onPress: () => console.log("Alerte fermée"), // Action pour le bouton OK
        style: "cancel", // Style visuel (optionnel)
      },
      {
        text: "Voir Records",
        onPress: async () => {
          // Exemple de données de test récupérées

          const token = await AsyncStorage.getItem('token');
          const response = await fetch(`${API_URL}radar-zone-times?filters[id_radar][$eq]=${id}`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json', // Type de contenu JSON
            }
          });
          const data = await response.json() as IApiRecords
          console.log('data log : ', data)

          setRecords(data.data.map(d=>d["Time_spent"]))
          setModalVisible(true)
        },
      },
    ],)

  }

  useEffect(()=>{console.log("records : ",records)},[records])

  return (
    <View style={styles.container}>
      <SafeAreaView>
        <TouchableOpacity style={styles.button} onPress={startTimer}>
          <Text style={styles.buttonText}>{"start"}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={stopTimer}>
          <Text style={styles.buttonText}>{"stop"}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={async () => (createRadarZoneTime({ Time_spent: seconds, id_radar: 12581 }))}>
          <Text style={styles.buttonText}>{"send"}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={async () => (checkUserOn)}>
          <Text style={styles.buttonText}>{"test"}</Text>
        </TouchableOpacity>

      </SafeAreaView>
      <Link href="/modal" style={styles.link}>
        Open modal
      </Link>
      {!isLogged && !isCo && <SafeAreaView style={styles.formcont}>
        <Text style={styles.text}>Sign up</Text>
        {/* <Text style={styles.text}>{formatTime(seconds)}</Text> */}
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

        {/* <TouchableOpacity style={styles.button} onPress={startTimer}>
          <Text style={styles.buttonText}>{"start"}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={stopTimer}>
          <Text style={styles.buttonText}>{"stop"}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={async () => (createRadarZoneTime({ Time_spent: seconds}))}>
          <Text style={styles.buttonText}>{"send"}</Text>
        </TouchableOpacity> */}


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
          <TouchableOpacity style={styles.button} onPress={handleLog}>
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
                  onPress={() => handlePress(radar.id)}
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
  link: {
    paddingTop: 20,
    fontSize: 20,
  },
});

