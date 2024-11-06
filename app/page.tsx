import CreateList from "@/components/create-list";
import { ToastDemo } from "@/components/get";
import List from "@/components/list";
import RouteToID from "@/components/route-to-id";



export default function Home() {
  return (
    <div className="max-w-7x1 flex flex-col gap-10 mx-auto p-10">
      <div className="flex justify-between items-center">
        <h1 className="text-4x1 font-bold">Test Maps Route</h1>
        {/* <CreateList />       */}
        <RouteToID />
        {/* <ToastDemo /> */}
        
      </div>     
      {/* <List /> */}
    </div>
  );
}
