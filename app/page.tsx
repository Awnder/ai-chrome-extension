import Image from "next/image";

export default function Home() {
    return (
        <div>
            <h1>Hello World</h1>
            <Image src="/images/ai.png" alt="AI" width={100} height={100} />
        </div>
    );
}
