import { Routes, Route } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import Login from './pages/Login'
import Register from './pages/Register'
import AdminLayout from './pages/admin/AdminLayout'
import DashboardAdmin from './pages/admin/DashboardAdmin'
import BookingServis from './pages/admin/BookingServis'
import DataCustomer from './pages/admin/DataCustomer'
import DataMekanik from './pages/admin/DataMekanik'
import EditMekanik from './pages/admin/Editmekanik'
import ProfilMekanikAdmin from './pages/admin/Profilmekanikadmin'
import DataKendaraan from './pages/admin/DataKendaraan'
import DataServis from './pages/admin/DataServis'
import ProdukSparepart from './pages/admin/ProdukSparepart'
import Transaksi from './pages/admin/Transaksi'
import Laporan from './pages/admin/Laporan'
import Pengaturan from './pages/admin/Pengaturan'
import MekanikLayout from './pages/mekanik/MekanikLayout'
import DashboardMekanik from './pages/mekanik/DashboardMekanik'
import DaftarPekerjaan from './pages/mekanik/DaftarPekerjaan'
import RiwayatPekerjaan from './pages/mekanik/RiwayatPekerjaan'
import ProfilMekanik from './pages/mekanik/ProfilMekanik'
import CustomerLayout from './pages/customer/CustomerLayout'
import DashboardCustomer from './pages/customer/DashboardCustomer'
import CustomerBooking from './pages/customer/CustomerBooking'
import CustomerDetailBooking from './pages/customer/CustomerDetailBooking'
import CustomerRiwayatServis from './pages/customer/CustomerRiwayatServis'
import CustomerKendaraan from './pages/customer/CustomerKendaraan'
import CustomerPromo from './pages/customer/CustomerPromo'
import CustomerPengaturan from './pages/customer/CustomerPengaturan'
import CustomerPesan from './pages/customer/CustomerPesan'
import CustomerBantuan from './pages/customer/CustomerBantuan'
import DetailLayanan from './pages/admin/DetailLayanan'
import AdminPromo from './pages/admin/AdminPromo'
import DetailPekerjaan from './pages/mekanik/DetailPekerjaan'
function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route path="/admin" element={<AdminLayout />}>
        <Route path="dashboard" element={<DashboardAdmin />} />
        <Route path="booking" element={<BookingServis />} />
        <Route path="customer" element={<DataCustomer />} />
        <Route path="mekanik" element={<DataMekanik />} />
        <Route path="mekanik/:id/edit" element={<EditMekanik />} />
        <Route path="mekanik/:id" element={<ProfilMekanikAdmin />} />
        <Route path="kendaraan" element={<DataKendaraan />} />
        <Route path="servis" element={<DataServis />} />
        <Route path="produk" element={<ProdukSparepart />} />
        <Route path="transaksi" element={<Transaksi />} />
        <Route path="laporan" element={<Laporan />} />
        <Route path="pengaturan" element={<Pengaturan />} />
        <Route path="servis/:id" element={<DetailLayanan />} />
        <Route path="promo" element={<AdminPromo />} />
      </Route>

      <Route path="/mekanik" element={<MekanikLayout />}>
        <Route path="dashboard" element={<DashboardMekanik />} />
        <Route path="pekerjaan" element={<DaftarPekerjaan />} />
        <Route path="riwayat" element={<RiwayatPekerjaan />} />
        <Route path="profil" element={<ProfilMekanik />} />
        <Route path="pekerjaan/:id" element={<DetailPekerjaan />} />
      </Route>

      <Route path="/customer" element={<CustomerLayout />}>
        <Route path="dashboard" element={<DashboardCustomer />} />
        <Route path="booking" element={<CustomerBooking />} />
        <Route path="booking/:id" element={<CustomerDetailBooking />} />
        <Route path="riwayat" element={<CustomerRiwayatServis />} />
        <Route path="kendaraan" element={<CustomerKendaraan />} />
        <Route path="promo" element={<CustomerPromo />} />
        <Route path="pengaturan" element={<CustomerPengaturan />} />
        <Route path="pesan" element={<CustomerPesan />} />
        <Route path="bantuan" element={<CustomerBantuan />} />
        
      </Route>
    </Routes>
  )
}

export default App