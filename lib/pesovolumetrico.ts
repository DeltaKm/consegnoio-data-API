

// densita standard pacco postale
// densità = 5000


export default function pesoVolumetico(
    lunghezza: number,
    larghezza: number,
    altezza: number,
    densita: number): number{
    return (lunghezza * larghezza * altezza) / densita
}