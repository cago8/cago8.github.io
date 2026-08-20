import { ListView } from '../components/ListView';
import { Portfolio } from '../components/Portfolio';

export default function Home() {
  // ListView is rendered on the server and handed to the client shell, so the
  // full content ships as static HTML regardless of the active view.
  return <Portfolio listView={<ListView />} />;
}
