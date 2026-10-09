import React, { useState } from 'react'
import { View, Text, TextInput, StyleSheet } from 'react-native'
import Button from '../components/Button'
import { login } from '../services/auth'

export default function LoginScreen(){
  const [email,setEmail] = useState('')
  const [password,setPassword] = useState('')
  const [msg,setMsg] = useState('')

  async function handle(){
    if (password.length < 12) {
      setMsg('Le mot de passe doit contenir au moins 12 caractères.')
      return
    }
    try{
      const res = await login(email,password)
      setMsg('Connecté')
    }catch(e){
      setMsg('Erreur login')
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Se connecter</Text>
      <TextInput style={styles.input} placeholder="Email" value={email} onChangeText={setEmail} />
      <TextInput style={styles.input} placeholder="Mot de passe" value={password} onChangeText={setPassword} secureTextEntry />
      <Button title="Se connecter" onPress={handle} />
      <Text>{msg}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container:{flex:1, padding:20, justifyContent:'center'},
  title:{fontSize:20,fontWeight:'700',marginBottom:16},
  input:{height:44,borderWidth:1,borderColor:'#ddd',borderRadius:8,padding:8,marginBottom:12}
})
