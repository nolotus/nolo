import React ,{useState,useEffect}from 'react'
import {Loading} from '../components/Loading'
import {Artcile} from '../components/Artcile'

// import Template from "../template"
const Home = () => {
    const [loading, setLoading] = useState(true)

    return (
        <>
            {loading? <Loading/>:<Artcile/>}
        </>
   
           
   
    )
}

export default Home
