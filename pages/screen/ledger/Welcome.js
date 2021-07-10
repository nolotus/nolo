import React, { useState, useEffect } from 'react';
import { Button, View, Text, StyleSheet } from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';

import PouchDB from './pouchdb';
import { dbAll, dbNew } from '../../../common/api';
export const Welcome = () => {
  const [accounts, setAccounts] = useState();
  const [result, setResult] = useState();
  const [currentDb, setCurrentDb] = useState();
  function openDB() {
    return new PouchDB('local', { adapter: 'react-native-sqlite' });
  }
  function openRemoteDB() {
    return new PouchDB('<COUCHDB_URL>');
  }
  async function replicateToRemote(local, remote) {
    return new Promise((resolve, reject) => {
      local.replicate
        .to(remote, {})
        .on('complete', async () => {
          console.log('done!');
          resolve();
        })
        .on('error', function (err) {
          console.error('failed to replicate:', err.message, err.stack);
          reject(err);
        });
    });
  }
  async function runPouchDB() {
    // await resetDB();
    const db = openDB();
    console.log('db info:', await db.info());
    setCurrentDb(db);
    // const remotedb = openRemoteDB();
    // console.log('remote db info:', await remotedb.info());

    db.changes({
      since: 'now',
      live: true,
    }).on('change', change => {
      console.log('change:', change);
    });

    // replicateFromRemote(db, remotedb)
    // await replicateToRemote(db, remotedb);
  }
  useEffect(() => {
    console.log('global.base64FromArrayBuffer:', global.base64FromArrayBuffer);
    if (global.base64FromArrayBuffer) {
      setResult('Running..');
      runPouchDB().then(() => setResult('Done!'));
    } else {
      console.warn('global.base64FromArrayBuffer is not defined');
      setResult('global.base64FromArrayBuffer is not defined. Reload the app.');
    }
  }, []);
  const recentFlow = [1, 2, 3];

  const showAll = () => {
    dbAll(currentDb).then(result => {
      console.log('result', result);
    });
  };
  const createAccout = async () => {
    console.log('currentDb', currentDb);
    dbNew(currentDb, { type: 'test' }).then(xx => {
      console.log('result', xx);
    });
  };
  const HomeScreen = ({ navigation }) => {
    return (
      <View>
        <View style={styles.container}>
          <Text>Result: {result}</Text>
        </View>
        <Text>开始记账</Text>
        {accounts ? (
          <Text>有</Text>
        ) : (
          <Button
            title="请新建账户"
            onPress={() => navigation.navigate('CreateAccount')}
          />
        )}

        {recentFlow.map(item => {
          return <Text key={item}>{item}</Text>;
        })}
      </View>
    );
  };

  const createAccountScreen = () => {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Text>Details Screen</Text>
        <Button onPress={createAccout} title="创建" />
        <Button onPress={showAll} title="创建" />
      </View>
    );
  };

  const Stack = createStackNavigator();

  return (
    <Stack.Navigator>
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="CreateAccount" component={createAccountScreen} />
    </Stack.Navigator>
  );
};
const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  box: {
    width: 60,
    height: 60,
    marginVertical: 20,
  },
});
